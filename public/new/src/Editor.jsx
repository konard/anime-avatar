// Editor.jsx — main VRM viewer/editor. Reads cfg + setCfg as props. Renders
// the 3D stage; optionally renders the drawer (`hideDrawer` when the host is
// swapping the drawer for a tests panel).
//
// Interaction summary:
//  - Orbit mouse: rotates camera, syncs cameraDist/Height/Fov back into cfg.
//  - Ctrl+drag: translates the character (charPos + dynamic offset). Release
//    triggers spring-back if cfg.charInertia is on.
//  - Drop .vrm / .glb: loads a new model. Drop .fbx (after model loaded):
//    loads and retargets as a Mixamo animation.
//  - Mouse move: feeds s.mouseNDC for lookMode='mouse'.
const S = window.Studio;
const { useRef, useEffect, useState, useCallback, useMemo } = React;
const HUMANOID_BONES = window.ACS_HUMANOID_BONES;
const BONE_GROUPS   = window.ACS_BONE_GROUPS;
const SCALE_BONES   = window.ACS_SCALE_BONES;
const POSE_PRESETS  = window.ACS_POSE_PRESETS;
const DEFAULTS      = window.ACS_DEFAULTS;
const DEFAULT_VRM_URL = window.ACS_DEFAULT_VRM_URL;
const ANIMATION_PRESETS = window.ACS_ANIMATION_PRESETS;
const MTOON_DEBUG_MODES = window.ACS_MTOON_DEBUG_MODES;
const GESTURES = window.ACS_GESTURE_PRESETS;
const MOODS = window.ACS_MOOD_PRESETS;

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function Editor({ cfg, setCfg, hideDrawer = false, inlineDrawer = false,
                   drawerWidth = 420, testsOnRight = false, testsWidth = 420 }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const cfgRef = useRef(cfg);   cfgRef.current = cfg;
  const setCfgRef = useRef(setCfg); setCfgRef.current = setCfg;

  const [status, setStatus] = useState('booting');
  const [error, setError] = useState(null);
  const [vrmName, setVrmName] = useState('pixiv VRM1 sample');
  const [vrmMeta, setVrmMeta] = useState(null);
  const [bones, setBones] = useState([]);
  const [exprs, setExprs] = useState([]);
  const [meshes, setMeshes] = useState([]);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [urlInput, setUrlInput] = useState(cfg.vrmUrl || DEFAULT_VRM_URL);
  const [animUrlInput, setAnimUrlInput] = useState(cfg.animationUrl || '');
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!cfg.showFPS) return;
    const id = setInterval(() => setFps(stateRef.current.fps || 0), 250);
    return () => clearInterval(id);
  }, [cfg.showFPS]);

  const available = useMemo(() => ({
    bones: new Set(bones), expressions: exprs, meshes,
  }), [bones, exprs, meshes]);

  const randomizers = useMemo(() => window.ACS_buildRandomizers(cfg, available), [available, cfg]);
  const resetters = useMemo(() => window.ACS_buildResetters(DEFAULTS), []);

  // --- 3D bootstrap --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      if (!window.THREE || !window.THREE.OrbitControls || !window.THREE_VRM || !window.GLTFLoader) {
        setTimeout(init, 80); return;
      }
      const THREE = window.THREE;
      const mount = mountRef.current;
      if (!mount) return;
      const W = mount.clientWidth || 800, H = mount.clientHeight || 600;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(cfgRef.current.bg);
      const camera = new THREE.PerspectiveCamera(cfgRef.current.cameraFov, W/H, 0.1, 50);
      camera.position.set(0, cfgRef.current.cameraHeight, cfgRef.current.cameraDist);
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      mount.appendChild(renderer.domElement);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.3, 0);
      controls.enableDamping = !!cfgRef.current.cameraInertia;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.4;
      controls.maxDistance = 8;

      controls.addEventListener('end', () => {
        const cur = cfgRef.current;
        const dist = Math.round(camera.position.distanceTo(controls.target) * 100) / 100;
        const height = Math.round(camera.position.y * 100) / 100;
        const fovR = Math.round(camera.fov * 10) / 10;
        if (Math.abs(dist - cur.cameraDist) > 0.02 ||
            Math.abs(height - cur.cameraHeight) > 0.02 ||
            Math.abs(fovR - cur.cameraFov) > 0.1) {
          setCfgRef.current({ ...cur, cameraDist: dist, cameraHeight: height, cameraFov: fovR });
        }
      });

      const key = new THREE.DirectionalLight(0xfff4e0, 1.15); key.position.set(2, 3.5, 2.5); scene.add(key);
      const fill = new THREE.DirectionalLight(0xb8d4ff, 0.55); fill.position.set(-2.5, 1.2, 1.5); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffc8dd, 0.85); rim.position.set(0, 2, -3); scene.add(rim);
      const ambient = new THREE.AmbientLight(0xffffff, 0.45); scene.add(ambient);

      const groundMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
      const ground = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), groundMat);
      ground.rotation.x = -Math.PI / 2; scene.add(ground);

      // Spring-bone / constraint helpers go under this group; toggled via cfg.
      const springHelperRoot = new THREE.Group();
      springHelperRoot.renderOrder = 10000;
      springHelperRoot.visible = false;
      scene.add(springHelperRoot);

      stateRef.current = {
        THREE, scene, camera, renderer, controls,
        lights: { key, fill, rim, ambient }, ground, groundMat,
        vrm: null, originalRest: {}, originalMats: [],
        springHelperRoot,
        animation: null, mixer: null,
        mouseNDC: { x: 0, y: 0 },
        charDyn: { offsetX: 0, offsetY: 0, velX: 0, velY: 0, dragging: false },
      };

      const onResize = () => {
        const w = mount.clientWidth, h = mount.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);
      stateRef.current.onResize = onResize;
      stateRef.current.ro = ro;

      // Mouse tracking for lookMode='mouse' + character Ctrl+drag.
      attachPointerHandlers(renderer.domElement, stateRef, cfgRef, setCfgRef, controls);

      // Drag-and-drop on the mount: .vrm/.glb → model; .fbx → animation.
      attachDropHandlers(mount, stateRef, cfgRef, loadVRMBufferRef, loadAnimationBufferRef);

      let raf;
      const clock = new THREE.Clock();
      let fpsFrames = [];
      const tick = () => {
        const dt = clock.getDelta();
        const c = cfgRef.current;
        const s = stateRef.current;
        const frameStart = performance.now();
        // Advance animation mixer first so apply.js can detect it via s.animation.action.
        if (s.mixer && s.animation?.action?.isRunning?.()) {
          s.mixer.timeScale = c.animationTimeScale ?? 1.0;
          s.mixer.update(dt);
        }
        try { window.ACS_applyAll(s, c, dt); } catch (e) { window.__applyErr = e.message; }
        if (s.vrm) {
          if (c.autoRotate) s.vrm.scene.rotation.y += dt * 0.5;
          else s.vrm.scene.rotation.y = 0;
          s.vrm.update?.(dt);
        }
        controls.update();
        renderer.render(scene, camera);
        const now = performance.now();
        fpsFrames.push(now);
        while (fpsFrames.length && now - fpsFrames[0] > 1000) fpsFrames.shift();
        stateRef.current.fps = fpsFrames.length;
        stateRef.current.frameMs = now - frameStart;
        raf = requestAnimationFrame(tick);
      };
      tick();
      stateRef.current.stopLoop = () => cancelAnimationFrame(raf);

      (window.__acsProbe ||= {}).B = () => window.ACS_probe(stateRef.current);
      window.__acsB = {
        getState: () => stateRef.current,
        fingerprintCanvas: () => window.ACS_fingerprintCanvas(stateRef.current),
        exportSVG: () => window.ACS_buildSVG(stateRef.current, cfgRef.current),
      };

      loadVRMFromURL(cfgRef.current.vrmUrl || DEFAULT_VRM_URL);
    };
    init();
    return () => {
      cancelled = true;
      const s = stateRef.current;
      if (s.stopLoop) s.stopLoop();
      if (s.onResize) window.removeEventListener('resize', s.onResize);
      if (s.ro) s.ro.disconnect();
      if (s.renderer) {
        s.renderer.dispose();
        if (mountRef.current && s.renderer.domElement.parentNode === mountRef.current)
          mountRef.current.removeChild(s.renderer.domElement);
      }
    };
  }, []);

  // --- VRM load helpers ----------------------------------------------------
  const loadVRMBufferRef = useRef(null);
  const loadAnimationBufferRef = useRef(null);

  const loadVRMBuffer = useCallback(async (buf, name) => {
    const s = stateRef.current;
    if (!s.THREE) return;
    setStatus('loading'); setError(null);
    try {
      const loader = new window.GLTFLoader();
      // Register VRMLoaderPlugin with helperRoot so spring-bone debug works.
      loader.register((parser) => new window.THREE_VRM.VRMLoaderPlugin(parser, {
        helperRoot: s.springHelperRoot, autoUpdateHumanBones: true,
      }));
      const gltf = await new Promise((res, rej) => loader.parse(buf, '', res, rej));
      try { window.THREE_VRM.VRMUtils.removeUnnecessaryVertices(gltf.scene); } catch {}
      try { window.THREE_VRM.VRMUtils.combineSkeletons?.(gltf.scene); } catch {}
      try { window.THREE_VRM.VRMUtils.combineMorphs?.(gltf.userData.vrm); } catch {}
      const vrm = gltf.userData.vrm;
      if (!vrm) throw new Error('No VRM extension in file');
      // Clean up previous VRM + mixer + spring helpers.
      if (s.vrm) {
        s.scene.remove(s.vrm.scene);
        try { window.THREE_VRM.VRMUtils.deepDispose?.(s.vrm.scene); } catch {}
        if (s.springHelperRoot) {
          while (s.springHelperRoot.children.length) s.springHelperRoot.remove(s.springHelperRoot.children[0]);
        }
        s.mixer = null;
        s.animation = null;
      }
      s.vrm = vrm;
      s.scene.add(vrm.scene);
      try { window.THREE_VRM.VRMUtils.rotateVRM0?.(vrm); } catch {}
      vrm.scene.rotation.y = 0;
      vrm.scene.traverse(n => { if (n.isMesh || n.isSkinnedMesh) n.frustumCulled = false; });

      // Fresh AnimationMixer bound to the new scene.
      s.mixer = new s.THREE.AnimationMixer(vrm.scene);

      s.originalRest = {};
      const boneList = [];
      if (vrm.humanoid) {
        for (const b of HUMANOID_BONES) {
          const node = vrm.humanoid.getNormalizedBoneNode(b);
          if (node) {
            s.originalRest[b] = {
              q: node.quaternion.clone(),
              p: node.position.clone(),
              s: node.scale.clone(),
            };
            const raw = vrm.humanoid.getRawBoneNode?.(b);
            if (raw) s.originalRest[b].rawS = raw.scale.clone();
            boneList.push(b);
          }
        }
      }
      setBones(boneList);

      const exprList = [];
      if (vrm.expressionManager) {
        for (const e of (vrm.expressionManager.expressions || [])) {
          const n = e.expressionName || e.name;
          if (n && !exprList.includes(n)) exprList.push(n);
        }
      }
      setExprs(exprList);

      s.originalMats = [];
      const meshList = [];
      const seen = new Set();
      const pickerSeen = new Set(); // deduplicate (Outline) clones
      vrm.scene.traverse(n => {
        if (!n.isMesh && !n.isSkinnedMesh) return;
        const meshName = n.name || `mesh_${meshList.length}`;
        const parentGroup = n.parent?.name && n.parent.name !== meshName ? n.parent.name : '';
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach((m, mi) => {
          if (!m) return;
          const matName = (m.name && m.name.trim()) || '';
          const key = matName || `${meshName}#${mi}`;
          const displayName = matName || parentGroup || meshName;
          const pickerKey = matName.replace(/\s*\(Outline\)\s*$/i, '').trim() || key;
          if (!seen.has(key)) seen.add(key);
          if (!pickerSeen.has(pickerKey)) {
            meshList.push({ key: pickerKey, displayName: pickerKey, meshName });
            pickerSeen.add(pickerKey);
          }
          s.originalMats.push({
            mesh: n, meshName, matName, key, pickerKey, displayName, idx: mi, mat: m,
            color: m.color ? m.color.clone() : null,
            shadeColor: m.shadeColorFactor ? m.shadeColorFactor.clone() : null,
            emissive: m.emissive ? m.emissive.clone() : null,
            emissiveIntensity: m.emissiveIntensity ?? 1,
            opacity: m.opacity ?? 1,
            transparent: !!m.transparent,
            repColor: window.ACS_deriveRepresentativeColor(m),
          });
        });
      });
      setMeshes(meshList);

      // Capture metadata (title/author/license/thumbnail).
      const meta = gltf.userData.vrmMeta || vrm.meta || {};
      setVrmMeta(meta);

      setVrmName(name || 'loaded.vrm');
      setStatus('loaded');

      // If an animation URL was selected before the model finished loading,
      // kick off retarget now.
      if (cfgRef.current.animationUrl) {
        loadAnimationFromURL(cfgRef.current.animationUrl).catch(() => {});
      }
    } catch (e) {
      console.error(e); setError(String(e.message || e)); setStatus('error');
    }
  }, []);

  const loadVRMFromURL = useCallback(async (url) => {
    setStatus('loading'); setError(null);
    try {
      const buf = await window.ACS_fetchVRMCached(url);
      const name = url.split('/').pop() || 'remote.vrm';
      await loadVRMBuffer(buf, name);
    } catch (e) {
      setError(String(e.message || e)); setStatus('error');
    }
  }, [loadVRMBuffer]);

  const [animationBump, setAnimationBump] = useState(0);

  const loadAnimationFromURL = useCallback(async (url) => {
    const s = stateRef.current;
    if (!s.vrm || !s.mixer) return;
    if (!url) {
      if (s.animation?.action) s.animation.action.stop();
      s.animation = null;
      s.animationMeta = null;
      setAnimationBump(n => n + 1);
      return;
    }
    try {
      const clip = await window.ACS_loadAnimationFromURL(url, s.vrm);
      if (s.animation?.action) s.animation.action.stop();
      const action = s.mixer.clipAction(clip);
      action.reset().play();
      const preset = (window.ACS_ANIMATION_PRESETS || []).find(p => p.url === url);
      s.animation = { clip, action, url };
      s.animationMeta = {
        name: preset?.label || url.split('/').pop() || 'animation',
        url, duration: clip.duration, trackCount: clip.tracks.length,
        credit: preset?.credit || '', license: preset?.license || '',
        source: preset ? 'preset' : 'url',
      };
      setAnimationBump(n => n + 1);
    } catch (e) {
      console.error('Animation load failed', e);
      setError('Animation load failed: ' + (e.message || e));
    }
  }, []);

  const loadAnimationFromBuffer = useCallback(async (buf, name) => {
    const s = stateRef.current;
    if (!s.vrm || !s.mixer) return;
    try {
      const clip = await window.ACS_loadAnimationFromBuffer(buf, s.vrm);
      if (s.animation?.action) s.animation.action.stop();
      const action = s.mixer.clipAction(clip);
      action.reset().play();
      s.animation = { clip, action, name };
      s.animationMeta = {
        name: name || 'dropped.fbx',
        url: '', duration: clip.duration, trackCount: clip.tracks.length,
        credit: '', license: 'user-supplied',
        source: 'local',
      };
      setAnimationBump(n => n + 1);
    } catch (e) {
      console.error('Animation load failed', e);
      setError('Animation load failed: ' + (e.message || e));
    }
  }, []);

  // Wire refs used by pointer/drop handlers (which are set up inside init).
  useEffect(() => { loadVRMBufferRef.current = loadVRMBuffer; }, [loadVRMBuffer]);
  useEffect(() => { loadAnimationBufferRef.current = loadAnimationFromBuffer; }, [loadAnimationFromBuffer]);

  useEffect(() => {
    window.__acsB_load = { loadVRMFromURL, loadVRMBuffer, loadAnimationFromURL, loadAnimationFromBuffer };
  }, [loadVRMFromURL, loadVRMBuffer, loadAnimationFromURL, loadAnimationFromBuffer]);

  // React to animationUrl cfg changes (e.g., preset dropdown).
  useEffect(() => {
    if (status !== 'loaded') return;
    loadAnimationFromURL(cfg.animationUrl).catch(() => {});
  }, [cfg.animationUrl, status, loadAnimationFromURL]);

  // --- SVG live preview (worker + adaptive debounce) -----------------------
  const svgWorkerRef = useRef(null);
  const svgIdleRef = useRef(true);
  const svgLastMsRef = useRef(400);
  const svgSentAtRef = useRef(0);
  useEffect(() => {
    if (!cfg.svgLivePreview) {
      if (svgWorkerRef.current) { svgWorkerRef.current.terminate(); svgWorkerRef.current = null; }
      setSvgMarkup('');
      return;
    }
    const worker = new Worker('svgWorker.js');
    svgWorkerRef.current = worker;
    svgIdleRef.current = true;
    worker.onmessage = (e) => {
      if (e.data.type === 'svg') {
        setSvgMarkup(e.data.svg);
        const rt = performance.now() - svgSentAtRef.current;
        svgLastMsRef.current = 0.6 * svgLastMsRef.current + 0.4 * rt;
      }
      svgIdleRef.current = true;
    };
    return () => { worker.terminate(); svgWorkerRef.current = null; };
  }, [cfg.svgLivePreview]);

  const sendSVGRequest = useCallback(() => {
    const worker = svgWorkerRef.current;
    if (!worker || !svgIdleRef.current) return;
    const s = stateRef.current;
    try {
      const snap = window.ACS_snapshotForWorker(s, cfgRef.current);
      if (snap) {
        svgIdleRef.current = false;
        svgSentAtRef.current = performance.now();
        worker.postMessage({ type: 'render', frameId: Date.now(), ...snap });
      }
    } catch {}
  }, []);

  // Reconcile camera position with sliders.
  useEffect(() => {
    if (status !== 'loaded') return;
    const s = stateRef.current;
    if (!s.camera || !s.controls) return;
    const cur = s.camera;
    const target = s.controls.target;
    const curDist = cur.position.distanceTo(target);
    if (Math.abs(curDist - cfg.cameraDist) > 0.04 || Math.abs(cur.position.y - cfg.cameraHeight) > 0.04) {
      const dir = cur.position.clone().sub(target).normalize();
      cur.position.copy(target).addScaledVector(dir, cfg.cameraDist);
      cur.position.y = cfg.cameraHeight;
      s.controls.update();
    }
  }, [cfg.cameraDist, cfg.cameraHeight, status]);

  const svgDebounceRef = useRef(null);
  useEffect(() => {
    if (!cfg.svgLivePreview || status !== 'loaded') return;
    const delay = Math.max(300, Math.round(svgLastMsRef.current * 1.5));
    clearTimeout(svgDebounceRef.current);
    svgDebounceRef.current = setTimeout(sendSVGRequest, delay);
    return () => clearTimeout(svgDebounceRef.current);
  }, [cfg, status, sendSVGRequest]);

  const refreshSVGPreview = () => sendSVGRequest();

  // --- Mutations -----------------------------------------------------------
  const applyGroupRandomize = (key) => {
    const fn = randomizers[key]; if (!fn) return;
    const c = deepClone(cfg); fn(c); setCfg(c);
  };
  const applyGroupReset = (key) => {
    const fn = resetters[key]; if (!fn) return;
    const c = deepClone(cfg); fn(c); setCfg(c);
  };
  const globalRandomize = () => {
    const c = deepClone(cfg);
    for (const k of Object.keys(randomizers)) randomizers[k](c);
    setCfg(c);
  };
  const globalReset = () => setCfg({ ...DEFAULTS });

  const updRot = (bone, axis, val) => {
    const rot = { ...(cfg.rot || {}) };
    rot[bone] = { ...(rot[bone] || {}), [axis]: val };
    if (cfg.mirrorArms && (bone.startsWith('left') || bone.startsWith('right'))) {
      const mir = bone.startsWith('left') ? bone.replace(/^left/, 'right') : bone.replace(/^right/, 'left');
      rot[mir] = { ...(rot[mir] || {}) };
      rot[mir][axis] = (axis === 'x') ? val : -val;
    }
    setCfg({ ...cfg, rot });
  };
  const updScale = (bone, val, mirror) => {
    const scale = { ...(cfg.scale || {}) };
    scale[bone] = val;
    if (mirror) scale[mirror] = val;
    setCfg({ ...cfg, scale });
  };
  const updExpr = (name, val) => setCfg({ ...cfg, expr: { ...(cfg.expr || {}), [name]: val } });
  const updMatColor = (k, color) =>
    setCfg({ ...cfg, matPerMesh: { ...(cfg.matPerMesh || {}), [k]: { ...(cfg.matPerMesh?.[k] || {}), color } } });
  const getRot = (b, a) => (cfg.rot?.[b]?.[a]) || 0;

  // --- Downloads + I/O -----------------------------------------------------
  const downloadVRM = async () => {
    const s = stateRef.current;
    if (!s.vrm || !window.GLTFExporter) { alert('VRM not loaded'); return; }
    try {
      window.ACS_applyAll(s, cfgRef.current, 0);
      const exporter = new window.GLTFExporter();
      const gltf = await new Promise((res, rej) => {
        exporter.parse(s.vrm.scene, res, rej, { binary: true, animations: [] });
      });
      const blob = new Blob([gltf], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (vrmName.replace(/\.vrm$/i, '') || 'character') + '-edited.glb';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  const downloadSVG = () => {
    const markup = svgMarkup || window.ACS_buildSVG(stateRef.current, cfgRef.current);
    if (!markup) return;
    const blob = new Blob([markup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'character.svg'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const cfgFileRef = useRef(null);
  const exportCfg = () => {
    const blob = new Blob([JSON.stringify(cfgRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'acs-config.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importCfg = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const text = await f.text();
      setCfg({ ...DEFAULTS, ...JSON.parse(text) });
    } catch (err) { alert('Invalid config JSON: ' + err.message); }
    e.target.value = '';
  };

  const fileInputRef = useRef(null);
  const animFileInputRef = useRef(null);
  const onFileChosen = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const buf = await f.arrayBuffer();
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext === 'fbx') await loadAnimationFromBuffer(buf, f.name);
    else await loadVRMBuffer(buf, f.name);
    e.target.value = '';
  };
  const onAnimFileChosen = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const buf = await f.arrayBuffer();
    await loadAnimationFromBuffer(buf, f.name);
    e.target.value = '';
  };

  // --- Bone group renderer -------------------------------------------------
  function renderBoneGroup(group) {
    const bs = {
      core: BONE_GROUPS.core,
      eyes: BONE_GROUPS.eyes,
      arms: [...BONE_GROUPS.armL, ...BONE_GROUPS.armR],
      legs: [...BONE_GROUPS.legL, ...BONE_GROUPS.legR],
      fingers: [...BONE_GROUPS.fingersL, ...BONE_GROUPS.fingersR],
    }[group] || [];
    const axes = group === 'eyes' ? ['x','y'] : (group === 'fingers' ? ['z'] : ['x','y','z']);
    const ranges = {
      core: { min:-1.0, max:1.0 },
      eyes: { min:-0.4, max:0.4 },
      arms: { min:-2.2, max:2.2 },
      legs: { min:-1.5, max:1.5 },
      fingers: { min:-1.5, max:1.5 },
    }[group];
    return bs.filter(b => available.bones.has(b)).map(b => (
      <div key={b} style={{ marginBottom: 6 }}>
        <div style={subhead}>{b}</div>
        {axes.map(a => (
          <div key={a} style={rowStyle}>
            <span style={{ fontSize: 10, opacity: 0.6, minWidth: 20 }}>{a}</span>
            <input data-testid={`rot-${b}-${a}`} type="range" min={ranges.min} max={ranges.max} step={0.01}
              value={cfg.rot?.[b]?.[a] ?? 0}
              onChange={e => updRot(b, a, parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#8c6eff' }} />
            <span style={{ fontSize: 10, opacity: 0.55, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
              {(cfg.rot?.[b]?.[a] ?? 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    ));
  }

  // --- Render --------------------------------------------------------------
  return (
    <>
      <S.Stage bg={cfg.bg}>
        <div ref={mountRef} data-testid="three-mount" style={{ position: 'absolute', inset: 0 }} />

        {cfg.svgLivePreview && (
          <window.GlassPanel testid="svg-preview" style={{
            position: 'absolute', left: 16, bottom: 54, width: 200, height: 266,
            overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', top:6, left:8, color:'rgba(255,255,255,0.7)', fontSize:9, letterSpacing:1.5, textTransform:'uppercase', zIndex: 2 }}>SVG preview · live</div>
            <div data-testid="svg-preview-content" className="acs-svg-fit"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
              style={{ width:'100%', height:'100%', overflow:'hidden' }} />
          </window.GlassPanel>
        )}

        {status !== 'loaded' && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <window.GlassPanel style={{ padding:'20px 30px', fontSize:14 }}>
              {status === 'booting' && 'Initializing…'}
              {status === 'loading' && 'Loading VRM…'}
              {status === 'error' && <span style={{color:'#ff9090'}}>Error: {error}</span>}
            </window.GlassPanel>
          </div>
        )}
        {status === 'loaded' && (
          <window.GlassPanel style={{
            position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
            padding:'4px 14px', borderRadius: 10,
            color:'rgba(255,255,255,0.75)', fontSize:10, letterSpacing:2,
            textTransform:'uppercase', pointerEvents:'none',
          }}>
            {vrmName} · {bones.length} bones · {exprs.length} expr · {meshes.length} mats
          </window.GlassPanel>
        )}
        {status === 'loaded' && cfg.showFPS && (
          <window.GlassPanel testid="fps" style={{
            position:'absolute', top:14, left:12,
            padding:'4px 10px', borderRadius:8, fontFamily:'ui-monospace, monospace',
            fontSize:11, pointerEvents:'none',
          }}>{fps} FPS</window.GlassPanel>
        )}
        <window.GlassPanel testid="hint" style={{
          position:'absolute', bottom:10, right:12,
          padding:'5px 10px', borderRadius:8,
          color:'rgba(255,255,255,0.75)', fontSize:10, letterSpacing:0.3,
          pointerEvents:'none', textAlign:'right', lineHeight:1.5,
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}>
          Drop .vrm / .fbx anywhere · Ctrl+drag to move
        </window.GlassPanel>

        {/* On-stage attribution overlay. Rendered into the canvas region so it
           ends up in every screenshot / SVG export / animation. Cannot be
           hidden from the UI by the end user. */}
        {status === 'loaded' && (
          <AttributionOverlay
            meta={vrmMeta}
            animation={stateRef.current.animation}
            animPreset={stateRef.current.animationMeta}
          />
        )}
      </S.Stage>

      {!hideDrawer && (
        <S.ConfigDrawer title="Editor"
          rightOffset={inlineDrawer ? testsWidth + 32 : 16}
          widthOverride={drawerWidth}
          mobileBottomHalf={testsOnRight}>
          <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            <button data-testid="global-random" onClick={globalRandomize} style={btn}>🎲 Randomize all</button>
            <button data-testid="global-reset" onClick={globalReset} style={btn}>Reset all</button>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <button data-testid="download-svg" onClick={downloadSVG} style={{...btn, flex:1}}>↓ SVG</button>
            <button data-testid="download-vrm" onClick={downloadVRM} style={{...btn, flex:1}}>↓ VRM</button>
          </div>
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            <button data-testid="export-cfg" onClick={exportCfg} style={{...btn, flex:1}}>↓ Config JSON</button>
            <button data-testid="import-cfg" onClick={() => cfgFileRef.current?.click()} style={{...btn, flex:1}}>↑ Import JSON</button>
            <input ref={cfgFileRef} type="file" accept="application/json,.json" onChange={importCfg} style={{display:'none'}} />
          </div>

          <S.Section title="VRM Source" testid="io">
            <S.Row label="Preset">
              <S.Select testid="vrm-preset" value={cfg.vrmPreset}
                onChange={v => {
                  const p = (window.ACS_VRM_PRESETS || []).find(x => x.id === v);
                  if (!p) { setCfg({...cfg, vrmPreset: v}); return; }
                  setUrlInput(p.url);
                  setCfg({...cfg, vrmPreset: v, vrmUrl: p.url});
                  loadVRMFromURL(p.url);
                }}
                options={[
                  ...(window.ACS_VRM_PRESETS || []).map(p => ({value:p.id, label:p.label})),
                  {value:'custom', label:'— custom URL —'},
                ]} />
            </S.Row>
            <S.Row label="URL">
              <div style={{ display:'flex', gap:4, flex:1, maxWidth:'100%' }}>
                <input data-testid="url-input" value={urlInput} onChange={e=>setUrlInput(e.target.value)} style={inputStyle} />
                <button data-testid="url-load" onClick={()=>{ setCfg({...cfg, vrmPreset: 'custom', vrmUrl: urlInput}); loadVRMFromURL(urlInput); }} style={{...btn, minWidth:46}}>Load</button>
              </div>
            </S.Row>
            <S.Row label="Local file">
              <>
                <input ref={fileInputRef} data-testid="file-input" type="file" accept=".vrm,.glb,.gltf,.fbx" onChange={onFileChosen} style={{ display:'none' }} />
                <button onClick={()=>fileInputRef.current?.click()} style={btn}>Choose .vrm / .fbx</button>
              </>
            </S.Row>
            <div style={{ fontSize:10, opacity:0.5, marginTop:4, lineHeight:1.5 }}>Drop any .vrm / .glb on the stage to load it. .fbx drops are retargeted as a Mixamo animation for the current avatar. All presets ship with permissive licences — the VRM file's own meta is always shown below (and as an on-stage © overlay).</div>
          </S.Section>

          <S.Section title="Animation" testid="animation"
            onRandomize={() => applyGroupRandomize('animation')}
            onReset={() => applyGroupReset('animation')}>
            <S.Row label="Preset">
              <S.Select testid="anim-preset" value={cfg.animationPresetId || 'none'}
                onChange={v => {
                  const p = ANIMATION_PRESETS.find(x => x.id === v);
                  if (!p) return;
                  setAnimUrlInput(p.url);
                  setCfg({...cfg, animationPresetId: p.id, animationUrl: p.url});
                }}
                options={ANIMATION_PRESETS.map(p => ({value:p.id, label:p.label}))} />
            </S.Row>
            <S.Row label="URL">
              <div style={{ display:'flex', gap:4, flex:1 }}>
                <input data-testid="anim-url" value={animUrlInput} onChange={e=>setAnimUrlInput(e.target.value)} placeholder=".fbx URL" style={inputStyle} />
                <button data-testid="anim-load" onClick={() => setCfg({...cfg, animationPresetId: 'custom', animationUrl: animUrlInput})} style={{...btn, minWidth:46}}>Load</button>
              </div>
            </S.Row>
            <S.Row label="Local file">
              <>
                <input ref={animFileInputRef} data-testid="anim-file" type="file" accept=".fbx" onChange={onAnimFileChosen} style={{ display:'none' }} />
                <button onClick={() => animFileInputRef.current?.click()} style={btn}>Choose .fbx</button>
              </>
            </S.Row>
            <S.Row label="Time scale">
              <S.Slider testid="anim-speed" value={cfg.animationTimeScale} min={0} max={2} step={0.01}
                onChange={v => setCfg({...cfg, animationTimeScale: v})} />
            </S.Row>
            <S.Row label="Stop">
              <button data-testid="anim-stop" onClick={() => { setAnimUrlInput(''); setCfg({...cfg, animationPresetId: 'none', animationUrl: ''}); }} style={btn}>⏹ Stop</button>
            </S.Row>
            <AnimationMetaView preset={(ANIMATION_PRESETS.find(p => p.id === cfg.animationPresetId) || null)}
                               animState={stateRef.current.animation}
                               animMeta={stateRef.current.animationMeta} />
          </S.Section>

          <S.Section title="Pose" testid="pose"
            onRandomize={() => applyGroupRandomize('pose')}
            onReset={() => applyGroupReset('pose')}>
            <S.Row label="Preset">
              <S.Select testid="pose-select" value={cfg.pose} onChange={v=>setCfg({...cfg, pose: v})}
                options={Object.keys(POSE_PRESETS).map(k => ({value:k, label:k}))} />
            </S.Row>
          </S.Section>

          <S.Section title="Gestures &amp; Mood" testid="gestures"
            onRandomize={() => applyGroupRandomize('gestures')}
            onReset={() => applyGroupReset('gestures')}>
            <S.Row label="Mood">
              <S.Select testid="mood" value={cfg.mood}
                onChange={v => setCfg({...cfg, mood: v})}
                options={Object.keys(MOODS).map(k => ({value:k, label:k}))} />
            </S.Row>
            <S.Row label="Easing">
              <S.Select testid="gesture-easing" value={cfg.gestureEasing}
                onChange={v => setCfg({...cfg, gestureEasing: v})}
                options={Object.keys(window.ACS_EASINGS).map(k => ({value:k, label:k}))} />
            </S.Row>
            <S.Row label="Emote fade">
              <S.Slider testid="expr-trans-ms" value={cfg.exprTransitionMs} min={0} max={2000} step={10}
                onChange={v => setCfg({...cfg, exprTransitionMs: v})} />
            </S.Row>
            <S.Row label="Emote easing">
              <S.Select testid="expr-trans-easing" value={cfg.exprTransitionEasing}
                onChange={v => setCfg({...cfg, exprTransitionEasing: v})}
                options={Object.keys(window.ACS_EASINGS).map(k => ({value:k, label:k}))} />
            </S.Row>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
              {Object.entries(GESTURES).map(([id, g]) => (
                <button key={id} data-testid={`gesture-${id}`} style={{...btn, flex:'1 1 auto', minWidth:80}}
                  onClick={() => setCfg({...cfg, gesture: id, gestureNonce: (cfg.gestureNonce || 0) + 1})}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize:10, opacity:0.5, marginTop:4 }}>
              One-shot procedural animations. Mood scales amplitude/speed and blends a background emotion with smooth easing.
            </div>
          </S.Section>

          <S.Section title="Behaviour" testid="behaviour"
            onRandomize={() => applyGroupRandomize('behaviour')}
            onReset={() => applyGroupReset('behaviour')}>
            <S.Row label="Auto-rotate"><S.Toggle testid="auto-rotate" value={cfg.autoRotate} onChange={v=>setCfg({...cfg, autoRotate: v})} /></S.Row>
            <S.Row label="Mirror arms"><S.Toggle testid="mirror-arms" value={cfg.mirrorArms} onChange={v=>setCfg({...cfg, mirrorArms: v})} /></S.Row>
            <S.Row label="Show FPS"><S.Toggle testid="show-fps" value={cfg.showFPS} onChange={v=>setCfg({...cfg, showFPS: v})} /></S.Row>
          </S.Section>

          <S.Section title="Idle Animation" testid="idle"
            onRandomize={() => applyGroupRandomize('idle')}
            onReset={() => applyGroupReset('idle')}>
            <div style={subhead}>Body</div>
            <S.Row label="Breathing"><S.Toggle testid="idle-breath" value={cfg.idleBreath} onChange={v=>setCfg({...cfg, idleBreath: v})} /></S.Row>
            <S.Row label="Breath amt"><S.Slider testid="idle-breath-amt" value={cfg.idleBreathAmt} min={0} max={0.03} step={0.001} onChange={v=>setCfg({...cfg, idleBreathAmt: v})} /></S.Row>
            <S.Row label="Blink"><S.Toggle testid="idle-blink" value={cfg.idleBlink} onChange={v=>setCfg({...cfg, idleBlink: v})} /></S.Row>
            <S.Row label="Blink/s"><S.Slider testid="idle-blink-freq" value={cfg.idleBlinkFreq} min={0.05} max={1} step={0.01} onChange={v=>setCfg({...cfg, idleBlinkFreq: v})} /></S.Row>
            <S.Row label="Micro head"><S.Toggle testid="idle-micro-head" value={cfg.idleMicroHead} onChange={v=>setCfg({...cfg, idleMicroHead: v})} /></S.Row>

            <div style={subhead}>Gaze sources</div>
            <FollowRow label="Follow camera" enabled={cfg.lookFollowCamera}
              eyes={cfg.lookCameraEyes} head={cfg.lookCameraHead}
              eyesAmount={cfg.lookCameraEyesAmount} headAmount={cfg.lookCameraHeadAmount}
              onEnabled={v=>setCfg({...cfg, lookFollowCamera:v})}
              onEyes={v=>setCfg({...cfg, lookCameraEyes:v})}
              onHead={v=>setCfg({...cfg, lookCameraHead:v})}
              onEyesAmount={v=>setCfg({...cfg, lookCameraEyesAmount:v})}
              onHeadAmount={v=>setCfg({...cfg, lookCameraHeadAmount:v})}
              testid="cam" />
            <FollowRow label="Follow mouse" enabled={cfg.lookFollowMouse}
              eyes={cfg.lookMouseEyes} head={cfg.lookMouseHead}
              eyesAmount={cfg.lookMouseEyesAmount} headAmount={cfg.lookMouseHeadAmount}
              onEnabled={v=>setCfg({...cfg, lookFollowMouse:v})}
              onEyes={v=>setCfg({...cfg, lookMouseEyes:v})}
              onHead={v=>setCfg({...cfg, lookMouseHead:v})}
              onEyesAmount={v=>setCfg({...cfg, lookMouseEyesAmount:v})}
              onHeadAmount={v=>setCfg({...cfg, lookMouseHeadAmount:v})}
              testid="mouse" />
            <FollowRow label="Random gaze" enabled={cfg.lookRandom}
              eyes={cfg.lookRandomEyes} head={cfg.lookRandomHead}
              eyesAmount={cfg.lookRandomEyesAmount} headAmount={cfg.lookRandomHeadAmount}
              onEnabled={v=>setCfg({...cfg, lookRandom:v})}
              onEyes={v=>setCfg({...cfg, lookRandomEyes:v})}
              onHead={v=>setCfg({...cfg, lookRandomHead:v})}
              onEyesAmount={v=>setCfg({...cfg, lookRandomEyesAmount:v})}
              onHeadAmount={v=>setCfg({...cfg, lookRandomHeadAmount:v})}
              testid="random" />
            <S.Row label="Saccade amt"><S.Slider testid="idle-gaze-amt" value={cfg.idleGazeAmt} min={0} max={1} step={0.01} onChange={v=>setCfg({...cfg, idleGazeAmt: v})} /></S.Row>

            <div style={subhead}>Smoothing</div>
            <S.Row label="Eyes"><S.Slider testid="look-smooth" value={cfg.lookSmoothing} min={0.5} max={20} step={0.1} onChange={v => setCfg({...cfg, lookSmoothing: v})} /></S.Row>
            <S.Row label="Head"><S.Slider testid="look-head-smooth" value={cfg.lookHeadSmoothing} min={0.3} max={12} step={0.1} onChange={v => setCfg({...cfg, lookHeadSmoothing: v})} /></S.Row>

            <div style={subhead}>Front cone (±°)</div>
            <S.Row label="Yaw"><S.Slider testid="look-cone-yaw" value={cfg.lookConeYaw} min={30} max={120} step={1} onChange={v => setCfg({...cfg, lookConeYaw: v})} /></S.Row>
            <S.Row label="Pitch"><S.Slider testid="look-cone-pitch" value={cfg.lookConePitch} min={15} max={80} step={1} onChange={v => setCfg({...cfg, lookConePitch: v})} /></S.Row>
            <S.Row label="Edge fade°"><S.Slider testid="look-cone-fade" value={cfg.lookConeFadeDeg} min={1} max={60} step={1} onChange={v => setCfg({...cfg, lookConeFadeDeg: v})} /></S.Row>

            <div style={subhead}>Eye follow fallback</div>
            <div style={{ fontSize:10, opacity:0.5, marginBottom:4, lineHeight:1.4 }}>When the eye gaze exceeds the threshold, boost the eye contribution by this much — gives committed glances for far targets.</div>
            <S.Row label="Over angle°"><S.Slider testid="look-eye-angle" value={cfg.lookEyeFollowAngle} min={0} max={90} step={0.5} onChange={v => setCfg({...cfg, lookEyeFollowAngle: v})} /></S.Row>
            <S.Row label="Amount"><S.Slider testid="look-eye-amt" value={cfg.lookEyeFollowAmount} min={0} max={1} step={0.01} onChange={v => setCfg({...cfg, lookEyeFollowAmount: v})} /></S.Row>

            <div style={subhead}>Head follow fallback</div>
            <div style={{ fontSize:10, opacity:0.5, marginBottom:4, lineHeight:1.4 }}>Same idea for the head — extra boost once the head target swings past the threshold.</div>
            <S.Row label="Over angle°"><S.Slider testid="look-head-angle" value={cfg.lookHeadFollowAngle} min={0} max={90} step={0.5} onChange={v => setCfg({...cfg, lookHeadFollowAngle: v})} /></S.Row>
            <S.Row label="Amount"><S.Slider testid="look-head-amt" value={cfg.lookHeadFollowAmount} min={0} max={1} step={0.01} onChange={v => setCfg({...cfg, lookHeadFollowAmount: v})} /></S.Row>

            <div style={subhead}>Random interval (s)</div>
            <S.Row label="Min"><S.Slider testid="look-rand-min" value={cfg.lookRandomMinInterval} min={0.1} max={3} step={0.05} onChange={v => setCfg({...cfg, lookRandomMinInterval: v})} /></S.Row>
            <S.Row label="Max"><S.Slider testid="look-rand-max" value={cfg.lookRandomMaxInterval} min={0.5} max={6} step={0.05} onChange={v => setCfg({...cfg, lookRandomMaxInterval: v})} /></S.Row>

            <div style={{ fontSize:10, opacity:0.55, marginTop:6, lineHeight:1.5 }}>
              Every gaze source has Eyes + Head switches. Enable one, the other, or both. Gaze stays inside a {Math.round((cfg.lookConeYaw||80)*2)}° × {Math.round((cfg.lookConePitch||50)*2)}° front cone; the head bone passes through an independent smoother so it never snaps.
            </div>
          </S.Section>

          {['core','eyes','arms','legs','fingers'].map(group => (
            <S.Section key={group} title={`Bones · ${group}`} testid={group}
              onRandomize={() => applyGroupRandomize(group)}
              onReset={() => applyGroupReset(group)}>
              {renderBoneGroup(group)}
            </S.Section>
          ))}

          <S.Section title="Proportions" testid="proportions"
            onRandomize={() => applyGroupRandomize('proportions')}
            onReset={() => applyGroupReset('proportions')}>
            {SCALE_BONES.filter(s => available.bones.has(s.b)).map(s => (
              <S.Row key={s.b} label={s.label}>
                <S.Slider testid={`scale-${s.b}`} value={cfg.scale?.[s.b] ?? 1} min={s.min} max={s.max} step={0.01}
                  onChange={v => updScale(s.b, v, s.mirror)} />
              </S.Row>
            ))}
          </S.Section>

          {exprs.length > 0 && (
            <S.Section title={`Expressions (${exprs.length})`} testid="expressions"
              onRandomize={() => applyGroupRandomize('expressions')}
              onReset={() => applyGroupReset('expressions')}>
              {exprs.map(e => (
                <S.Row key={e} label={e}>
                  <S.Slider testid={`expr-${e}`} value={cfg.expr?.[e] ?? 0} min={0} max={1} step={0.01}
                    onChange={v => updExpr(e, v)} />
                </S.Row>
              ))}
            </S.Section>
          )}

          <S.Section title="LookAt bias" testid="lookAt"
            onRandomize={() => applyGroupRandomize('lookAt')}
            onReset={() => applyGroupReset('lookAt')}>
            <div style={{ fontSize:10, opacity:0.55, marginBottom:6, lineHeight:1.5 }}>
              Static gaze offset applied on top of whatever eye idle animations are running.
              Gaze follow modes live in <b>Idle Animation</b> above.
            </div>
            <S.Row label="Yaw°"><S.Slider testid="look-yaw" value={cfg.lookYaw} min={-60} max={60} step={0.5} onChange={v => setCfg({...cfg, lookYaw: v})} /></S.Row>
            <S.Row label="Pitch°"><S.Slider testid="look-pitch" value={cfg.lookPitch} min={-40} max={40} step={0.5} onChange={v => setCfg({...cfg, lookPitch: v})} /></S.Row>
          </S.Section>

          <S.Section title="Character" testid="character"
            onRandomize={() => applyGroupRandomize('character')}
            onReset={() => applyGroupReset('character')}>
            <S.Row label="X"><S.Slider testid="char-x" value={cfg.charPos?.x ?? 0} min={-1} max={1} step={0.01} onChange={v => setCfg({...cfg, charPos:{...cfg.charPos, x:v}})} /></S.Row>
            <S.Row label="Y"><S.Slider testid="char-y" value={cfg.charPos?.y ?? 0} min={-1} max={1} step={0.01} onChange={v => setCfg({...cfg, charPos:{...cfg.charPos, y:v}})} /></S.Row>
            <S.Row label="Inertia"><S.Toggle testid="char-inertia" value={cfg.charInertia} onChange={v => setCfg({...cfg, charInertia: v})} /></S.Row>
            <S.Row label="Spring K"><S.Slider testid="char-k" value={cfg.charSpringK} min={0.5} max={15} step={0.1} onChange={v => setCfg({...cfg, charSpringK: v})} /></S.Row>
            <S.Row label="Damping"><S.Slider testid="char-damp" value={cfg.charDamping} min={0.5} max={12} step={0.1} onChange={v => setCfg({...cfg, charDamping: v})} /></S.Row>
            <div style={{ fontSize:10, opacity:0.5, marginTop:4 }}>Ctrl+drag on stage to fling the character; it springs back when inertia is on.</div>
          </S.Section>

          <S.Section title="Materials" testid="materials"
            onRandomize={() => applyGroupRandomize('materials')}
            onReset={() => applyGroupReset('materials')}>
            <S.Row label="Global tint"><S.ColorPick testid="mat-tint" value={cfg.matGlobalTint} onChange={v => setCfg({...cfg, matGlobalTint: v})} /></S.Row>
            <S.Row label="Tint amt"><S.Slider testid="mat-tint-amt" value={cfg.matTintAmount} min={0} max={1} step={0.01} onChange={v => setCfg({...cfg, matTintAmount: v})} /></S.Row>
            <S.Row label="Saturation"><S.Slider testid="mat-saturation" value={cfg.matSaturation} min={0} max={2} step={0.02} onChange={v => setCfg({...cfg, matSaturation: v})} /></S.Row>
            <S.Row label="Emissive"><S.ColorPick testid="mat-emissive" value={cfg.matEmissive} onChange={v => setCfg({...cfg, matEmissive: v})} /></S.Row>
            <S.Row label="Emit amt"><S.Slider testid="mat-emissive-amt" value={cfg.matEmissiveAmount} min={0} max={1} step={0.01} onChange={v => setCfg({...cfg, matEmissiveAmount: v})} /></S.Row>
            {meshes.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={subhead}>Per-material override</div>
                {meshes.slice(0, 30).map(m => {
                  const rec = (stateRef.current.originalMats || []).find(r => r.pickerKey === m.key);
                  const seed = cfg.matPerMesh?.[m.key]?.color || rec?.repColor || '#ffffff';
                  return (
                    <S.Row key={m.key} label={(m.displayName || m.key).slice(0, 22)}>
                      <S.ColorPick testid={`mat-mesh-${m.key}`} value={seed}
                        onChange={v => updMatColor(m.key, v)} />
                    </S.Row>
                  );
                })}
              </div>
            )}
          </S.Section>

          <S.Section title="Lights" testid="lights"
            onRandomize={() => applyGroupRandomize('lights')}
            onReset={() => applyGroupReset('lights')}>
            <S.Row label="Key color"><S.ColorPick testid="key-color" value={cfg.keyColor} onChange={v => setCfg({...cfg, keyColor: v})} /></S.Row>
            <S.Row label="Key intensity"><S.Slider testid="key-intensity" value={cfg.keyIntensity} min={0} max={3} step={0.02} onChange={v => setCfg({...cfg, keyIntensity: v})} /></S.Row>
            <S.Row label="Fill color"><S.ColorPick testid="fill-color" value={cfg.fillColor} onChange={v => setCfg({...cfg, fillColor: v})} /></S.Row>
            <S.Row label="Fill intensity"><S.Slider testid="fill-intensity" value={cfg.fillIntensity} min={0} max={2} step={0.02} onChange={v => setCfg({...cfg, fillIntensity: v})} /></S.Row>
            <S.Row label="Rim color"><S.ColorPick testid="rim-color" value={cfg.rimColor} onChange={v => setCfg({...cfg, rimColor: v})} /></S.Row>
            <S.Row label="Rim intensity"><S.Slider testid="rim-intensity" value={cfg.rimIntensity} min={0} max={2} step={0.02} onChange={v => setCfg({...cfg, rimIntensity: v})} /></S.Row>
            <S.Row label="Ambient color"><S.ColorPick testid="ambient-color" value={cfg.ambientColor} onChange={v => setCfg({...cfg, ambientColor: v})} /></S.Row>
            <S.Row label="Ambient int."><S.Slider testid="ambient-intensity" value={cfg.ambientIntensity} min={0} max={2} step={0.02} onChange={v => setCfg({...cfg, ambientIntensity: v})} /></S.Row>
          </S.Section>

          <S.Section title="Scene" testid="scene"
            onRandomize={() => applyGroupRandomize('scene')}
            onReset={() => applyGroupReset('scene')}>
            <S.Row label="Background"><S.ColorPick testid="bg" value={cfg.bg} onChange={v => setCfg({...cfg, bg: v})} /></S.Row>
            <S.Row label="Ground"><S.Slider testid="ground-opacity" value={cfg.groundOpacity} min={0} max={1} step={0.01} onChange={v => setCfg({...cfg, groundOpacity: v})} /></S.Row>
          </S.Section>

          <S.Section title="3D Camera" testid="camera"
            onRandomize={() => applyGroupRandomize('camera')}
            onReset={() => applyGroupReset('camera')}>
            <div style={{fontSize:10, opacity:0.5, marginBottom:4}}>Mouse orbit updates these in real time.</div>
            <S.Row label="Inertia"><S.Toggle testid="cam-inertia" value={cfg.cameraInertia} onChange={v => setCfg({...cfg, cameraInertia: v})} /></S.Row>
            <S.Row label="FOV"><S.Slider testid="cam-fov" value={cfg.cameraFov} min={10} max={80} step={0.5} onChange={v => setCfg({...cfg, cameraFov: v})} /></S.Row>
            <S.Row label="Distance"><S.Slider testid="cam-dist" value={cfg.cameraDist} min={0.8} max={6} step={0.05} onChange={v => setCfg({...cfg, cameraDist: v})} /></S.Row>
            <S.Row label="Height"><S.Slider testid="cam-height" value={cfg.cameraHeight} min={0} max={2.5} step={0.02} onChange={v => setCfg({...cfg, cameraHeight: v})} /></S.Row>
          </S.Section>

          <S.Section title="2D Camera (SVG)" testid="svgCamera"
            onRandomize={() => applyGroupRandomize('svgCamera')}
            onReset={() => applyGroupReset('svgCamera')}>
            <S.Row label="FOV"><S.Slider testid="svgcam-fov" value={cfg.svgCamFov} min={10} max={80} step={0.5} onChange={v => setCfg({...cfg, svgCamFov: v})} /></S.Row>
            <S.Row label="Distance"><S.Slider testid="svgcam-dist" value={cfg.svgCamDist} min={0.8} max={6} step={0.05} onChange={v => setCfg({...cfg, svgCamDist: v})} /></S.Row>
            <S.Row label="Height"><S.Slider testid="svgcam-height" value={cfg.svgCamHeight} min={0} max={2.5} step={0.02} onChange={v => setCfg({...cfg, svgCamHeight: v})} /></S.Row>
          </S.Section>

          <S.Section title="2D SVG Export" testid="svg"
            onRandomize={() => applyGroupRandomize('svg')}
            onReset={() => applyGroupReset('svg')}>
            <S.Row label="Live preview"><S.Toggle testid="svg-live" value={cfg.svgLivePreview} onChange={v => setCfg({...cfg, svgLivePreview: v})} /></S.Row>
            <S.Row label="Yaw°"><S.Slider testid="svg-yaw" value={cfg.svgYaw} min={-180} max={180} step={1} onChange={v => setCfg({...cfg, svgYaw: v})} /></S.Row>
            <S.Row label="Pitch°"><S.Slider testid="svg-pitch" value={cfg.svgPitch} min={-60} max={60} step={0.5} onChange={v => setCfg({...cfg, svgPitch: v})} /></S.Row>
            <S.Row label="Background"><S.ColorPick testid="svg-bg" value={cfg.svgBg} onChange={v => setCfg({...cfg, svgBg: v})} /></S.Row>
            <S.Row label="Stroke"><S.ColorPick testid="svg-stroke" value={cfg.svgStroke} onChange={v => setCfg({...cfg, svgStroke: v})} /></S.Row>
            <S.Row label="Stroke wt"><S.Slider testid="svg-stroke-w" value={cfg.svgStrokeWidth} min={0} max={2} step={0.05} onChange={v => setCfg({...cfg, svgStrokeWidth: v})} /></S.Row>
            <S.Row label="Quality"><S.Slider testid="svg-quality" value={cfg.svgQuality} min={0.2} max={1.0} step={0.05} onChange={v => setCfg({...cfg, svgQuality: v})} /></S.Row>
            {cfg.svgLivePreview && (
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={refreshSVGPreview} data-testid="svg-refresh" style={{...btn, flex:'none', minWidth:110}}>↻ Refresh preview</button>
              </div>
            )}
          </S.Section>

          <S.Section title="Debug" testid="debug"
            onRandomize={() => applyGroupRandomize('debug')}
            onReset={() => applyGroupReset('debug')}>
            <S.Row label="Bone helpers"><S.Toggle testid="dbg-bones" value={cfg.debugBoneHelpers} onChange={v => setCfg({...cfg, debugBoneHelpers: v})} /></S.Row>
            <S.Row label="Axes"><S.Toggle testid="dbg-axes" value={cfg.debugAxes} onChange={v => setCfg({...cfg, debugAxes: v})} /></S.Row>
            <S.Row label="Grid"><S.Toggle testid="dbg-grid" value={cfg.debugGrid} onChange={v => setCfg({...cfg, debugGrid: v})} /></S.Row>
            <S.Row label="Spring bones"><S.Toggle testid="dbg-spring" value={cfg.debugSpringBones} onChange={v => setCfg({...cfg, debugSpringBones: v})} /></S.Row>
            <S.Row label="Wireframe"><S.Toggle testid="dbg-wire" value={cfg.debugWireframe} onChange={v => setCfg({...cfg, debugWireframe: v})} /></S.Row>
            <S.Row label="Mesh only"><S.Toggle testid="dbg-mesh-only" value={cfg.debugMeshOnly} onChange={v => setCfg({...cfg, debugMeshOnly: v})} /></S.Row>
            <S.Row label="MToon mode">
              <S.Select testid="dbg-mtoon" value={cfg.debugMToonMode}
                onChange={v => setCfg({...cfg, debugMToonMode: v})}
                options={MTOON_DEBUG_MODES.map(m => ({value:m, label:m}))} />
            </S.Row>
          </S.Section>

          <S.Section title="Metadata" testid="meta">
            <MetaView meta={vrmMeta} />
          </S.Section>

          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 14, lineHeight: 1.6 }}>
            VRM source: pixiv/three-vrm sample (CC0 — direct URL, not bundled). Load your own .vrm via URL or drag-drop.
          </div>
        </S.ConfigDrawer>
      )}
    </>
  );
}

// Compact block used in the Idle Animation section — source toggle, Eyes/Head
// chips, and two INDEPENDENT amount sliders (eyes amount + head amount). The
// sliders do NOT sum to 1; at 100/100 eyes + head track in perfect sync.
function FollowRow({ label, enabled, eyes, head, eyesAmount, headAmount,
                     onEnabled, onEyes, onHead, onEyesAmount, onHeadAmount,
                     testid }) {
  const { btnBase, btnActive } = window.ACS_BTN;
  const chipOn = { ...btnActive, padding: '4px 8px', fontSize: 10, minWidth: 40 };
  const chipOff = { ...btnBase, padding: '4px 8px', fontSize: 10, minWidth: 40 };
  const amountRow = (label, v, onChange, testid) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft: 14 }}>
      <span style={{ fontSize: 10, opacity: 0.55, minWidth: 68 }}>{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={v ?? 0}
        data-testid={testid}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#8c6eff', height: 24 }} />
      <span style={{ fontSize: 10, opacity: 0.55, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
        {Math.round((v ?? 0) * 100)}%
      </span>
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth: 0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth: 0 }}>
        <span style={{ fontSize: 12, opacity: 0.75, flex: 1, minWidth: 0 }}>{label}</span>
        <window.Studio.Toggle testid={`follow-${testid}`} value={enabled} onChange={onEnabled} />
        <button data-testid={`follow-${testid}-eyes`} style={enabled && eyes ? chipOn : chipOff}
          disabled={!enabled} onClick={() => onEyes(!eyes)}>eyes</button>
        <button data-testid={`follow-${testid}-head`} style={enabled && head ? chipOn : chipOff}
          disabled={!enabled} onClick={() => onHead(!head)}>head</button>
      </div>
      {enabled && eyes && amountRow('eyes amt', eyesAmount, onEyesAmount, `follow-${testid}-eamt`)}
      {enabled && head && amountRow('head amt', headAmount, onHeadAmount, `follow-${testid}-hamt`)}
    </div>
  );
}

// Pull the most interesting attribution fields out of vrm.meta. Falls back
// to the selected preset's credit string if the VRM didn't embed one.
function buildAttribution(vrmMeta, vrmPreset) {
  if (!vrmMeta && !vrmPreset) return null;
  const authors = (vrmMeta?.authors && vrmMeta.authors.length ? vrmMeta.authors.join(', ') : '') ||
                  vrmPreset?.credit || '';
  const copyright = vrmMeta?.copyrightInformation || '';
  const license = vrmMeta?.licenseUrl || vrmPreset?.license || '';
  const title = vrmMeta?.name || '';
  const credit = copyright || (authors ? `© ${authors}` : '');
  return { credit, license, title, authors };
}

// Always-on overlay painted into the stage itself, so screenshots and SVG
// exports carry the attribution string with them. There is intentionally no
// UI toggle to hide it — that's how the user asked for it.
function AttributionOverlay({ meta, animation, animPreset }) {
  const vrm = buildAttribution(meta, null);
  const animLines = [];
  if (animPreset?.credit) animLines.push(animPreset.credit);
  else if (animation?.name) animLines.push(`Animation: ${animation.name}`);
  else if (animation?.url) animLines.push(`Animation: ${animation.url.split('/').pop()}`);

  if (!vrm?.credit && animLines.length === 0) return null;
  return (
    <window.GlassPanel testid="attribution" style={{
      position: 'absolute', left: 12, bottom: 10, zIndex: 2,
      padding: '6px 12px', borderRadius: 10,
      color: 'rgba(255,255,255,0.88)',
      fontSize: 10, lineHeight: 1.45, letterSpacing: 0.2,
      fontFamily: 'ui-monospace, Menlo, monospace',
      pointerEvents: 'none',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      {vrm?.credit && <div>{vrm.credit}{vrm.title ? ` · ${vrm.title}` : ''}</div>}
      {vrm?.license && <div style={{opacity:0.7}}>{vrm.license}</div>}
      {animLines.map((l, i) => (
        <div key={i} style={{opacity:0.7}}>{l}</div>
      ))}
    </window.GlassPanel>
  );
}

function AnimationMetaView({ preset, animState, animMeta }) {
  // animMeta wins (set when an animation actually loaded); fallback to the
  // currently-selected preset entry for its credit / license strings.
  const pairs = [];
  const name = animMeta?.name || preset?.label || '';
  const duration = animMeta?.duration;
  const tracks = animMeta?.trackCount;
  const url = animMeta?.url || preset?.url || '';
  const credit = animMeta?.credit || preset?.credit || '';
  const license = animMeta?.license || preset?.license || '';
  if (!name && !url) return null;
  if (name) pairs.push(['name', name]);
  if (typeof duration === 'number') pairs.push(['duration', duration.toFixed(2) + ' s']);
  if (typeof tracks === 'number') pairs.push(['tracks', tracks + ' retargeted']);
  if (credit) pairs.push(['credit', credit]);
  if (license) pairs.push(['license', license]);
  if (url) pairs.push(['url', url]);
  return (
    <div data-testid="anim-meta" style={{ marginTop:8, fontFamily:'ui-monospace,Menlo,monospace', fontSize:10 }}>
      {pairs.map(([k, v]) => (
        <div key={k} style={{ display:'flex', gap:8, padding:'2px 0' }}>
          <span style={{ opacity:0.5, minWidth:70 }}>{k}</span>
          <span style={{ opacity:0.85, wordBreak:'break-all' }}>{typeof v === 'string' && v.length > 80 ? v.slice(0, 77) + '…' : v}</span>
        </div>
      ))}
    </div>
  );
}

function MetaView({ meta }) {
  if (!meta) return <div style={{fontSize:11, opacity:0.55}}>No metadata yet — load a VRM.</div>;
  const thumbnailSrc = meta.thumbnailImage?.src || null;
  const pairs = [];
  for (const k of Object.keys(meta)) {
    if (k === 'thumbnailImage') continue;
    const v = meta[k];
    if (v == null) continue;
    if (typeof v === 'object') pairs.push([k, JSON.stringify(v)]);
    else pairs.push([k, String(v)]);
  }
  return (
    <div data-testid="meta-view" style={{ fontSize:11, lineHeight:1.6 }}>
      {thumbnailSrc && (
        <img data-testid="meta-thumb" src={thumbnailSrc} alt="thumbnail" style={{ width:96, height:96, objectFit:'cover', borderRadius:6, marginBottom:8, border:'1px solid rgba(255,255,255,0.08)' }} />
      )}
      <div style={{ maxHeight:180, overflowY:'auto', fontFamily:'ui-monospace,Menlo,monospace', fontSize:10 }}>
        {pairs.length === 0 && <div style={{opacity:0.55}}>(no fields)</div>}
        {pairs.map(([k, v]) => (
          <div key={k} style={{ display:'flex', gap:8, padding:'2px 0' }}>
            <span style={{ opacity:0.5, minWidth:90 }}>{k}</span>
            <span style={{ opacity:0.85, wordBreak:'break-word' }}>{v.length > 120 ? v.slice(0, 117) + '…' : v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Pointer + drop helpers (outside component to keep Editor body readable).
// Both read/write through the refs so they see live cfg without re-binding.

function attachPointerHandlers(dom, stateRef, cfgRef, setCfgRef, controls) {
  // Mouse NDC for lookMode='mouse' + Ctrl+drag for character translation.
  const getNDC = (e) => {
    const r = dom.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: -((e.clientY - r.top) / r.height) * 2 + 1,
    };
  };
  const onMove = (e) => {
    const s = stateRef.current;
    if (!s) return;
    const ndc = getNDC(e);
    s.mouseNDC = ndc;
    if (s.charDyn?.dragging) {
      // Convert NDC delta to world-space by unprojecting through the camera.
      const cam = s.camera;
      const THREE = s.THREE;
      const start = s.charDyn.startNDC;
      const worldAtPlane = (nx, ny) => {
        // Project a point on plane z=0 from NDC.
        const v = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
        const dir = v.sub(cam.position).normalize();
        const t = -cam.position.z / dir.z;
        return cam.position.clone().addScaledVector(dir, t);
      };
      const a = worldAtPlane(start.x, start.y);
      const b = worldAtPlane(ndc.x, ndc.y);
      const dx = b.x - a.x, dy = b.y - a.y;
      const prevX = s.charDyn.offsetX, prevY = s.charDyn.offsetY;
      s.charDyn.offsetX = s.charDyn.startOffX + dx;
      s.charDyn.offsetY = s.charDyn.startOffY + dy;
      // Track velocity for spring-back.
      s.charDyn.velX = (s.charDyn.offsetX - prevX) / 0.016;
      s.charDyn.velY = (s.charDyn.offsetY - prevY) / 0.016;
    }
  };
  const onDown = (e) => {
    const s = stateRef.current;
    if (!s) return;
    if (e.ctrlKey || e.metaKey) {
      // Suppress OrbitControls while dragging the character.
      controls.enabled = false;
      const ndc = getNDC(e);
      s.charDyn.dragging = true;
      s.charDyn.startNDC = ndc;
      s.charDyn.startOffX = s.charDyn.offsetX || 0;
      s.charDyn.startOffY = s.charDyn.offsetY || 0;
      e.preventDefault();
    }
  };
  const onUp = () => {
    const s = stateRef.current;
    if (!s) return;
    if (s.charDyn?.dragging) {
      s.charDyn.dragging = false;
      controls.enabled = true;
      // If inertia is off, commit the dragged offset into cfg.charPos so the
      // character stays where the user dropped it (no spring-back).
      if (!cfgRef.current.charInertia) {
        const cur = cfgRef.current;
        const nx = (cur.charPos?.x || 0) + s.charDyn.offsetX;
        const ny = (cur.charPos?.y || 0) + s.charDyn.offsetY;
        s.charDyn.offsetX = 0; s.charDyn.offsetY = 0;
        s.charDyn.velX = 0; s.charDyn.velY = 0;
        setCfgRef.current({ ...cur, charPos: { x: nx, y: ny } });
      }
    }
  };
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  // Clean-up is handled by React unmount disposing the renderer; handlers live
  // on the canvas element which will be removed with it.
}

function attachDropHandlers(mount, stateRef, cfgRef, loadVRMRef, loadAnimRef) {
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;
    // Process each file in order — model first, then animation.
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const buf = await file.arrayBuffer();
      if (ext === 'fbx') {
        if (loadAnimRef.current) await loadAnimRef.current(buf, file.name);
      } else {
        if (loadVRMRef.current) await loadVRMRef.current(buf, file.name);
      }
    }
  };
  mount.addEventListener('dragover', onDragOver);
  mount.addEventListener('drop', onDrop);
}

const btn = {
  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3,
};
const inputStyle = {
  flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff', padding: '7px 8px', borderRadius: 6, fontSize: 11, outline: 'none',
};
const subhead = { fontSize:10, opacity:0.55, marginTop:6, marginBottom:2, letterSpacing:0.5, textTransform:'uppercase' };
const rowStyle = { display:'flex', alignItems:'center', gap:6 };

window.Editor = Editor;
// Legacy alias so existing test registry + tooling keeps working.
window.OptionB = Editor;
window.OptionB_defaults = DEFAULTS;
window.OptionB_GROUPS = {
  BONE_GROUPS, GROUP_CFG_KEYS: window.ACS_GROUP_CFG_KEYS,
  HUMANOID_BONES, SCALE_BONES, POSE_PRESETS,
};
