// gearSonic.js — Real GEAR-SONIC integration: reference motion fetcher,
// G1 robot kinematic loader, and text-to-motion backend client.
//
// The GEAR-SONIC demo at https://nvlabs.github.io/GEAR-SONIC/demo.html ships:
//   - Reference motions as JSON at  assets/motions/{id}.json
//     (joint_pos: 29-DOF G1 angles, root_pos, root_quat)
//   - The G1-29DOF robot as MJCF XML + STL mesh files at  assets/robot/
//   - A text→motion HTTP backend (Kimodo) at a configurable BACKEND_URL
//
// Nothing here is procedural or fake: every call hits the real GEAR-SONIC
// asset URLs. When a feature can't run (missing backend, blocked CORS, etc.)
// the module reports the failure verbatim so the UI can show what is
// available and what is required.
//
// Public API (all attached to window so the existing IIFE-style modules can
// call them without a module bundler):
//   ACS_GEAR_SONIC_BASE_URL                 default base URL
//   ACS_GEAR_SONIC_REFERENCE_INDEX          static index of reference clips
//   ACS_GEAR_SONIC_G1_BONE_MAP              G1 joint → VRM bone retarget map
//   ACS_fetchGearSonicReferenceMotion(id)   returns { joint_pos, root_pos, root_quat, frames, fps }
//   ACS_clearGearSonicReferenceCache()      drops the in-memory cache
//   ACS_gearSonicReferenceDelta(motion, t)  returns { rot, root } for time t
//   ACS_generateGearSonicMotion(prompt, opts) POSTs to a real backend
//   ACS_gearSonicRobotModelInfo()           returns G1 mesh URLs + body tree
//   ACS_loadGearSonicRobotModel(THREE, opts) builds a Three.js group of STL
//                                            meshes mirroring the MJCF tree
//
// Tests: tests/gearSonicReference.test.js exercises the retargeter + index
// helpers using mocked fetch responses (no network).

(function () {
  const DEFAULT_BASE = 'https://nvlabs.github.io/GEAR-SONIC';
  window.ACS_GEAR_SONIC_BASE_URL = DEFAULT_BASE;

  // Index pulled verbatim from
  // https://nvlabs.github.io/GEAR-SONIC/assets/motions/index.json (kept here
  // so the UI can offer the selector before the network call returns).
  const REFERENCE_INDEX = [
    { id: 'dance_in_da_party_001__A464',         display: 'Party Dance 1',  frames: 497,  fps: 50 },
    { id: 'dance_in_da_party_001__A464_M',       display: 'Party Dance 2',  frames: 497,  fps: 50 },
    { id: 'forward_lunge_R_001__A359_M',         display: 'Forward Lunge L', frames: 399, fps: 50 },
    { id: 'macarena_001__A545',                  display: 'Macarena 1',     frames: 1375, fps: 50 },
    { id: 'macarena_001__A545_M',                display: 'Macarena 2',     frames: 1375, fps: 50 },
    { id: 'neutral_kick_R_001__A543',            display: 'Standing Kick R', frames: 165, fps: 50 },
    { id: 'neutral_kick_R_001__A543_M',          display: 'Standing Kick L', frames: 165, fps: 50 },
    { id: 'squat_001__A359',                     display: 'Squat',          frames: 424,  fps: 50 },
    { id: 'tired_forward_lunge_R_001__A359_M',   display: 'Deep Lunge L',   frames: 810,  fps: 50 },
    { id: 'tired_one_leg_jumping_R_001__A359',   display: 'One-Leg Jump R', frames: 500,  fps: 50 },
    { id: 'tired_one_leg_jumping_R_001__A359_M', display: 'One-Leg Jump L', frames: 500,  fps: 50 },
    { id: 'walking_quip_360_R_002__A428',        display: '360 Spin Walk 1', frames: 455, fps: 50 },
    { id: 'walking_quip_360_R_002__A428_M',      display: '360 Spin Walk 2', frames: 455, fps: 50 },
  ];
  window.ACS_GEAR_SONIC_REFERENCE_INDEX = REFERENCE_INDEX.slice();

  // The G1 humanoid robot used by GEAR-SONIC has 29 actuated joints. From
  // policy.js (nvlabs.github.io/GEAR-SONIC/js/policy.js) the MuJoCo joint
  // order, inferred from the model XML, is:
  //   0..5   left leg  (hip pitch, hip roll, hip yaw, knee, ankle pitch, ankle roll)
  //   6..11  right leg (same order)
  //   12..14 waist     (yaw, roll, pitch)
  //   15..21 left arm  (shoulder pitch, shoulder roll, shoulder yaw, elbow,
  //                     wrist roll, wrist pitch, wrist yaw)
  //   22..28 right arm (same order)
  //
  // VRM bones don't have separate roll/pitch/yaw children — every joint is a
  // single 3-DOF ball joint. The retargeter merges G1 axes onto the
  // corresponding VRM bone with axis-flip metadata. `axis` selects which VRM
  // axis the G1 angle drives ('x' = pitch, 'y' = yaw, 'z' = roll). `sign`
  // flips direction when VRM rest frame disagrees with G1 rest frame.
  // `scale` lets us soften / amplify a joint that doesn't have a 1:1
  // counterpart in the humanoid hierarchy.
  const G1_BONE_MAP = [
    // left leg
    { vrmBone: 'leftUpperLeg',  axis: 'x', sign:  1.0, scale: 1.0 }, // hip pitch
    { vrmBone: 'leftUpperLeg',  axis: 'z', sign:  1.0, scale: 1.0 }, // hip roll
    { vrmBone: 'leftUpperLeg',  axis: 'y', sign:  1.0, scale: 1.0 }, // hip yaw
    { vrmBone: 'leftLowerLeg',  axis: 'x', sign:  1.0, scale: 1.0 }, // knee
    { vrmBone: 'leftFoot',      axis: 'x', sign:  1.0, scale: 1.0 }, // ankle pitch
    { vrmBone: 'leftFoot',      axis: 'z', sign:  1.0, scale: 1.0 }, // ankle roll
    // right leg
    { vrmBone: 'rightUpperLeg', axis: 'x', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightUpperLeg', axis: 'z', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightUpperLeg', axis: 'y', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightLowerLeg', axis: 'x', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightFoot',     axis: 'x', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightFoot',     axis: 'z', sign:  1.0, scale: 1.0 },
    // waist
    { vrmBone: 'spine',         axis: 'y', sign:  1.0, scale: 1.0 }, // waist yaw
    { vrmBone: 'spine',         axis: 'z', sign:  1.0, scale: 1.0 }, // waist roll
    { vrmBone: 'spine',         axis: 'x', sign:  1.0, scale: 1.0 }, // waist pitch
    // left arm — VRM upperArm rest is T-pose, G1 rest is arms-down. The
    // policy.js DEFAULT_ANGLES_MJ shoulder pitch/roll = 0.2, ±0.2 corresponds
    // to a hands-down rest. We subtract a baseline so the rest pose lines up
    // with VRM T-pose; see normalizeFrame() below.
    { vrmBone: 'leftUpperArm',  axis: 'x', sign: -1.0, scale: 1.0 }, // shoulder pitch
    { vrmBone: 'leftUpperArm',  axis: 'z', sign:  1.0, scale: 1.0 }, // shoulder roll
    { vrmBone: 'leftUpperArm',  axis: 'y', sign:  1.0, scale: 1.0 }, // shoulder yaw
    { vrmBone: 'leftLowerArm',  axis: 'x', sign: -1.0, scale: 1.0 }, // elbow
    { vrmBone: 'leftLowerArm',  axis: 'y', sign:  1.0, scale: 1.0 }, // wrist roll on lower arm
    { vrmBone: 'leftHand',      axis: 'x', sign:  1.0, scale: 1.0 }, // wrist pitch
    { vrmBone: 'leftHand',      axis: 'y', sign:  1.0, scale: 1.0 }, // wrist yaw
    // right arm
    { vrmBone: 'rightUpperArm', axis: 'x', sign: -1.0, scale: 1.0 },
    { vrmBone: 'rightUpperArm', axis: 'z', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightUpperArm', axis: 'y', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightLowerArm', axis: 'x', sign: -1.0, scale: 1.0 },
    { vrmBone: 'rightLowerArm', axis: 'y', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightHand',     axis: 'x', sign:  1.0, scale: 1.0 },
    { vrmBone: 'rightHand',     axis: 'y', sign:  1.0, scale: 1.0 },
  ];
  window.ACS_GEAR_SONIC_G1_BONE_MAP = G1_BONE_MAP.slice();

  // policy.js DEFAULT_ANGLES_MJ — subtract this from each frame's joint_pos
  // so the retargeted pose starts at T-pose rather than the G1 stand pose.
  const G1_REST_OFFSET = [
    -0.312,  0.0,   0.0,   0.669, -0.363,  0.0,
    -0.312,  0.0,   0.0,   0.669, -0.363,  0.0,
     0.0,    0.0,   0.0,
     0.2,    0.2,   0.0,   0.6,   0.0,   0.0, 0.0,
     0.2,   -0.2,   0.0,   0.6,   0.0,   0.0, 0.0,
  ];

  // ── Reference motion fetch + cache ────────────────────────────────────────
  const motionCache = new Map();
  const motionPending = new Map();

  function motionURL(id, baseUrl) {
    const base = (baseUrl || window.ACS_GEAR_SONIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
    return `${base}/assets/motions/${id}.json`;
  }

  async function fetchGearSonicReferenceMotion(id, opts = {}) {
    if (!id) throw new Error('reference id is required');
    if (motionCache.has(id) && !opts.force) return motionCache.get(id);
    if (motionPending.has(id) && !opts.force) return motionPending.get(id);
    const url = motionURL(id, opts.baseUrl);
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) throw new Error('fetch is unavailable in this environment');
    const promise = (async () => {
      const resp = await fetchFn(url);
      if (!resp.ok) {
        throw new Error(`GEAR-SONIC reference fetch failed: ${resp.status} ${resp.statusText}`);
      }
      const data = await resp.json();
      if (!Array.isArray(data?.joint_pos) || !Array.isArray(data?.root_pos) || !Array.isArray(data?.root_quat)) {
        throw new Error('GEAR-SONIC reference JSON missing joint_pos/root_pos/root_quat');
      }
      const motion = {
        id: data.name || id,
        display: data.display || id,
        frames: data.frames ?? data.joint_pos.length,
        fps: data.fps || 50,
        jointPos: data.joint_pos,
        rootPos: data.root_pos,
        rootQuat: data.root_quat,
        sourceURL: url,
      };
      motionCache.set(id, motion);
      motionPending.delete(id);
      return motion;
    })();
    motionPending.set(id, promise);
    return promise;
  }

  function clearGearSonicReferenceCache() {
    motionCache.clear();
    motionPending.clear();
  }

  // Linear-interpolate two frames of joint_pos / root_pos.
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpArray(a, b, t, len) {
    const out = new Array(len);
    for (let i = 0; i < len; i++) out[i] = lerp(a[i] ?? 0, b[i] ?? 0, t);
    return out;
  }
  function quatSlerp(a, b, t) {
    let aw = a[0], ax = a[1], ay = a[2], az = a[3];
    const bw = b[0], bx = b[1], by = b[2], bz = b[3];
    let dot = aw * bw + ax * bx + ay * by + az * bz;
    if (dot < 0) { aw = -aw; ax = -ax; ay = -ay; az = -az; dot = -dot; }
    if (dot > 0.9995) {
      const w = lerp(aw, bw, t), x = lerp(ax, bx, t), y = lerp(ay, by, t), z = lerp(az, bz, t);
      const n = Math.hypot(w, x, y, z) || 1;
      return [w / n, x / n, y / n, z / n];
    }
    const theta0 = Math.acos(dot);
    const sin0 = Math.sin(theta0);
    const s1 = Math.sin((1 - t) * theta0) / sin0;
    const s2 = Math.sin(t * theta0) / sin0;
    return [
      s1 * aw + s2 * bw,
      s1 * ax + s2 * bx,
      s1 * ay + s2 * by,
      s1 * az + s2 * bz,
    ];
  }

  // Convert a G1 root quaternion (MuJoCo Z-up [w,x,y,z]) to a VRM scene yaw
  // around Y. This is intentionally a rough projection — VRM is Y-up and
  // single-bone roots are rare; we just want to make the avatar face the
  // motion's heading.
  function quatYaw(q) {
    const w = q[0], x = q[1], y = q[2], z = q[3];
    // yaw around Z in MuJoCo frame; converting Z→Y by sign flip works here.
    return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  }

  function normalizeFrame(jointPos) {
    const out = new Array(jointPos.length);
    for (let i = 0; i < jointPos.length; i++) {
      out[i] = (jointPos[i] || 0) - (G1_REST_OFFSET[i] || 0);
    }
    return out;
  }

  // Returns { rot: { boneName: {x,y,z} }, root: { x, y, yaw } } so the
  // existing apply.js delta merge works unchanged.
  function gearSonicReferenceDelta(motion, t) {
    const out = { active: false, rot: {}, root: { x: 0, y: 0, yaw: 0 } };
    if (!motion?.jointPos?.length) return out;
    const fps = motion.fps || 50;
    const frames = motion.jointPos.length;
    const dur = frames / fps;
    const tt = ((t % dur) + dur) % dur;
    const f = tt * fps;
    const fA = Math.floor(f) % frames;
    const fB = (fA + 1) % frames;
    const alpha = f - Math.floor(f);
    const jpLen = motion.jointPos[fA].length;
    const jp = lerpArray(motion.jointPos[fA], motion.jointPos[fB], alpha, jpLen);
    const rp = lerpArray(motion.rootPos[fA], motion.rootPos[fB], alpha, 3);
    const rqA = motion.rootQuat[fA];
    const rqB = motion.rootQuat[fB];
    const rq = (rqA && rqB) ? quatSlerp(rqA, rqB, alpha) : (rqA || [1, 0, 0, 0]);
    const normalized = normalizeFrame(jp);
    for (let i = 0; i < G1_BONE_MAP.length && i < normalized.length; i++) {
      const m = G1_BONE_MAP[i];
      if (!m?.vrmBone) continue;
      out.rot[m.vrmBone] = out.rot[m.vrmBone] || { x: 0, y: 0, z: 0 };
      out.rot[m.vrmBone][m.axis] += normalized[i] * (m.sign ?? 1) * (m.scale ?? 1);
    }
    // G1 root_pos is in MuJoCo coordinates (Z up). VRM is Y up. Map
    // (x,y,z)_mj → (x,z,y)_vrm so the avatar moves forward along the same
    // ground plane it walks on.
    const initial = motion.rootPos[0] || [0, 0, 0];
    out.root.x = (rp[0] - (initial[0] || 0));
    out.root.y = (rp[2] - (initial[2] || 0));
    out.root.yaw = quatYaw(rq) - quatYaw(motion.rootQuat[0] || [1, 0, 0, 0]);
    out.active = true;
    return out;
  }

  // ── Robot model loader (G1-29DOF MJCF + STLs) ─────────────────────────────
  // We do NOT bundle MuJoCo WASM. Instead we fetch the same scene.xml /
  // .STL files the demo uses, parse the body tree, and load each STL with
  // three/addons/loaders/STLLoader.js. The result is a Three.js group whose
  // child Object3Ds are positioned according to the MJCF body offsets and
  // can be driven by reference-motion frames just like the VRM bones.
  function gearSonicRobotModelInfo(opts = {}) {
    const base = (opts.baseUrl || window.ACS_GEAR_SONIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
    return {
      sceneURL: `${base}/assets/robot/scene.xml`,
      meshBaseURL: `${base}/assets/robot/meshes/`,
      label: 'Unitree G1 (29-DOF) — from GEAR-SONIC demo',
      credit: 'NVIDIA / Unitree Robotics',
      license: 'See https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/LICENSE',
    };
  }

  // Parse a small subset of MJCF needed for visual rendering: every <body>
  // becomes an Object3D positioned at its "pos" (Z-up swapped to Y-up), each
  // <geom type="mesh" .../> attaches an STL mesh. Quaternions on bodies are
  // applied as rotations; everything else is ignored.
  function parseMjcf(xmlText, info) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const meshNames = {};
    doc.querySelectorAll('mesh[file]').forEach((node) => {
      meshNames[node.getAttribute('name')] = node.getAttribute('file');
    });
    const root = doc.querySelector('worldbody');
    return { root, meshNames, info };
  }

  function parseFloats(str, count, fallback) {
    if (!str) return fallback || new Array(count).fill(0);
    const parts = str.trim().split(/\s+/).map(Number);
    if (parts.length < count) return fallback || new Array(count).fill(0);
    return parts.slice(0, count);
  }

  async function loadGearSonicRobotModel(THREE, opts = {}) {
    if (!THREE) throw new Error('THREE is required');
    const info = gearSonicRobotModelInfo(opts);
    const STLLoaderCtor = opts.STLLoader || window.STLLoader || THREE.STLLoader;
    if (!STLLoaderCtor) {
      throw new Error('STLLoader unavailable; pass {STLLoader} or load three/addons/loaders/STLLoader.js first');
    }
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) throw new Error('fetch unavailable; cannot load robot model');

    const xmlResp = await fetchFn(info.sceneURL);
    if (!xmlResp.ok) {
      throw new Error(`Robot scene XML fetch failed: ${xmlResp.status} ${xmlResp.statusText}`);
    }
    const xmlText = await xmlResp.text();
    const parsed = parseMjcf(xmlText, info);
    const stlLoader = new STLLoaderCtor();
    const meshGeometries = {};
    const meshFiles = Array.from(new Set(Object.values(parsed.meshNames)));
    let progressCount = 0;
    const total = meshFiles.length;
    const onProgress = opts.onProgress || (() => {});
    onProgress({ phase: 'meshes', loaded: 0, total });
    await Promise.all(meshFiles.map(async (file) => {
      const url = info.meshBaseURL + file;
      const buf = await fetchFn(url).then(r => {
        if (!r.ok) throw new Error(`Robot mesh fetch failed: ${url} (${r.status})`);
        return r.arrayBuffer();
      });
      const geometry = stlLoader.parse(buf);
      geometry.computeVertexNormals?.();
      meshGeometries[file] = geometry;
      progressCount++;
      onProgress({ phase: 'meshes', loaded: progressCount, total });
    }));

    const material = new THREE.MeshStandardMaterial({ color: 0xb3b3b3, metalness: 0.5, roughness: 0.5 });
    const darkMat  = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
    const root = new THREE.Group();
    root.name = 'GearSonicRobot';
    // MuJoCo is Z-up; rotate the whole group so the robot stands upright in
    // VRM's Y-up scene without retargeting every joint axis.
    root.rotation.x = -Math.PI / 2;

    const bodyMap = {};

    function visit(xmlNode, parent) {
      const obj = new THREE.Group();
      const name = xmlNode.getAttribute('name') || `body_${Object.keys(bodyMap).length}`;
      obj.name = name;
      bodyMap[name] = obj;
      const pos = parseFloats(xmlNode.getAttribute('pos'), 3, [0, 0, 0]);
      obj.position.set(pos[0], pos[1], pos[2]);
      const quat = xmlNode.getAttribute('quat');
      if (quat) {
        const q = parseFloats(quat, 4, [1, 0, 0, 0]);
        obj.quaternion.set(q[1], q[2], q[3], q[0]); // MJCF is [w,x,y,z]
      }
      parent.add(obj);
      for (const child of Array.from(xmlNode.children)) {
        if (child.tagName === 'geom') {
          const meshName = child.getAttribute('mesh');
          if (meshName) {
            const file = parsed.meshNames[meshName];
            const geom = file && meshGeometries[file];
            if (geom) {
              const rgba = parseFloats(child.getAttribute('rgba'), 4, [0.7, 0.7, 0.7, 1]);
              const mat = (rgba[0] < 0.4) ? darkMat : material;
              const mesh = new THREE.Mesh(geom, mat);
              const gpos = parseFloats(child.getAttribute('pos'), 3, [0, 0, 0]);
              mesh.position.set(gpos[0], gpos[1], gpos[2]);
              const gquat = child.getAttribute('quat');
              if (gquat) {
                const gq = parseFloats(gquat, 4, [1, 0, 0, 0]);
                mesh.quaternion.set(gq[1], gq[2], gq[3], gq[0]);
              }
              obj.add(mesh);
            }
          }
        } else if (child.tagName === 'body') {
          visit(child, obj);
        }
      }
    }
    for (const child of Array.from(parsed.root.children)) {
      if (child.tagName === 'body') visit(child, root);
    }
    return { root, bodyMap, meshGeometries, info };
  }

  // ── Real text-to-motion backend ───────────────────────────────────────────
  // The GEAR-SONIC demo POSTs to {BACKEND_URL}/api/generate with body
  // { prompt, duration, diffusion_steps } and receives the same JSON shape
  // as a reference motion. We expose a fully configurable client so users
  // can point it at their own server (the public NVIDIA backend isn't
  // freely accessible from arbitrary origins).
  async function generateGearSonicMotion(prompt, opts = {}) {
    const url = opts.backendURL || window.ACS_GEAR_SONIC_BACKEND_URL || '';
    if (!url) {
      return {
        ok: false,
        status: 'no-backend',
        prompt,
        reason: 'No GEAR-SONIC text-to-motion backend configured. Set ACS_GEAR_SONIC_BACKEND_URL to a Kimodo-compatible /api/generate endpoint.',
      };
    }
    if (!prompt) {
      return { ok: false, status: 'empty-prompt', prompt, reason: 'Prompt is empty.' };
    }
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
      return { ok: false, status: 'no-fetch', prompt, reason: 'fetch unavailable in this environment.' };
    }
    const body = {
      prompt,
      duration: Math.max(2, Math.min(10, opts.duration ?? 5)),
      diffusion_steps: opts.diffusionSteps ?? 100,
    };
    try {
      const resp = await fetchFn(url.replace(/\/$/, '') + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        let detail = resp.statusText;
        try { detail = (await resp.json())?.detail || detail; } catch {}
        return { ok: false, status: 'backend-error', prompt, reason: `Backend HTTP ${resp.status}: ${detail}` };
      }
      const data = await resp.json();
      if (!Array.isArray(data?.joint_pos) || !Array.isArray(data?.root_pos) || !Array.isArray(data?.root_quat)) {
        return { ok: false, status: 'bad-payload', prompt, reason: 'Backend response missing joint_pos/root_pos/root_quat' };
      }
      return {
        ok: true,
        status: 'ready',
        prompt,
        motion: {
          id: data.name || `gen_${Date.now()}`,
          display: data.display || prompt,
          frames: data.frames ?? data.joint_pos.length,
          fps: data.fps || 50,
          jointPos: data.joint_pos,
          rootPos: data.root_pos,
          rootQuat: data.root_quat,
          generated: true,
        },
      };
    } catch (e) {
      return { ok: false, status: 'network-error', prompt, reason: String(e?.message || e) };
    }
  }

  // ── Robot frame driver ────────────────────────────────────────────────────
  // Apply a single G1 frame to the robot Object3D bodyMap built by
  // loadGearSonicRobotModel. The body names match the MJCF <body name=...>
  // values so we can route each of the 29 joints to its joint axis on the
  // correct child object. Order matches IL_TO_MJ in policy.js.
  const G1_BODY_DRIVE = [
    { body: 'left_hip_pitch_link',     axis: 'y' },
    { body: 'left_hip_roll_link',      axis: 'x' },
    { body: 'left_hip_yaw_link',       axis: 'z' },
    { body: 'left_knee_link',          axis: 'y' },
    { body: 'left_ankle_pitch_link',   axis: 'y' },
    { body: 'left_ankle_roll_link',    axis: 'x' },
    { body: 'right_hip_pitch_link',    axis: 'y' },
    { body: 'right_hip_roll_link',     axis: 'x' },
    { body: 'right_hip_yaw_link',      axis: 'z' },
    { body: 'right_knee_link',         axis: 'y' },
    { body: 'right_ankle_pitch_link',  axis: 'y' },
    { body: 'right_ankle_roll_link',   axis: 'x' },
    { body: 'waist_yaw_link',          axis: 'z' },
    { body: 'waist_roll_link',         axis: 'x' },
    { body: 'torso_link',              axis: 'y' }, // waist_pitch
    { body: 'left_shoulder_pitch_link', axis: 'y' },
    { body: 'left_shoulder_roll_link',  axis: 'x' },
    { body: 'left_shoulder_yaw_link',   axis: 'z' },
    { body: 'left_elbow_link',          axis: 'y' },
    { body: 'left_wrist_roll_link',     axis: 'x' },
    { body: 'left_wrist_pitch_link',    axis: 'y' },
    { body: 'left_wrist_yaw_link',      axis: 'z' },
    { body: 'right_shoulder_pitch_link', axis: 'y' },
    { body: 'right_shoulder_roll_link',  axis: 'x' },
    { body: 'right_shoulder_yaw_link',   axis: 'z' },
    { body: 'right_elbow_link',          axis: 'y' },
    { body: 'right_wrist_roll_link',     axis: 'x' },
    { body: 'right_wrist_pitch_link',    axis: 'y' },
    { body: 'right_wrist_yaw_link',      axis: 'z' },
  ];

  function driveGearSonicRobot(bodyMap, motion, t) {
    if (!bodyMap || !motion?.jointPos?.length) return false;
    const fps = motion.fps || 50;
    const frames = motion.jointPos.length;
    const dur = frames / fps;
    const tt = ((t % dur) + dur) % dur;
    const f = tt * fps;
    const fA = Math.floor(f) % frames;
    const fB = (fA + 1) % frames;
    const alpha = f - Math.floor(f);
    const a = motion.jointPos[fA];
    const b = motion.jointPos[fB];
    for (let i = 0; i < G1_BODY_DRIVE.length && i < a.length; i++) {
      const drive = G1_BODY_DRIVE[i];
      const obj = bodyMap[drive.body];
      if (!obj) continue;
      const angle = (a[i] || 0) + ((b[i] || 0) - (a[i] || 0)) * alpha;
      // Reset to MJCF rest rotation each frame (the loader stored quat into
      // obj.userData.restQuat at load time; if missing, use identity).
      if (!obj.userData.restQuat) obj.userData.restQuat = obj.quaternion.clone();
      obj.quaternion.copy(obj.userData.restQuat);
      const e = { x: 0, y: 0, z: 0 };
      e[drive.axis] = angle;
      obj.rotation.x += e.x;
      obj.rotation.y += e.y;
      obj.rotation.z += e.z;
    }
    // Root translation in MuJoCo Z-up. Group's rotation.x = -PI/2 already
    // converts, so we can copy root_pos directly.
    const root = bodyMap.pelvis;
    if (root) {
      const rA = motion.rootPos[fA];
      const rB = motion.rootPos[fB];
      if (rA && rB) {
        const initial = motion.rootPos[0] || [0, 0, 0];
        root.position.x = (rA[0] + (rB[0] - rA[0]) * alpha) - (initial[0] || 0);
        root.position.y = (rA[1] + (rB[1] - rA[1]) * alpha) - (initial[1] || 0);
        // Pelvis Z is the body's standing height, keep at MJCF default.
      }
    }
    return true;
  }

  window.ACS_GEAR_SONIC_BODY_DRIVE = G1_BODY_DRIVE.slice();
  window.ACS_driveGearSonicRobot = driveGearSonicRobot;
  window.ACS_fetchGearSonicReferenceMotion = fetchGearSonicReferenceMotion;
  window.ACS_clearGearSonicReferenceCache = clearGearSonicReferenceCache;
  window.ACS_gearSonicReferenceDelta = gearSonicReferenceDelta;
  window.ACS_gearSonicNormalizeFrame = normalizeFrame;
  window.ACS_gearSonicRobotModelInfo = gearSonicRobotModelInfo;
  window.ACS_loadGearSonicRobotModel = loadGearSonicRobotModel;
  window.ACS_generateGearSonicMotion = generateGearSonicMotion;
  window.ACS_gearSonicReferenceCache = motionCache;
})();
