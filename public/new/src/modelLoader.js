// modelLoader.js — multi-format model loader dispatcher for issue #36.
//
// The studio originally hard-coded the VRM path: `loadVRMBuffer` always
// registered the `VRMLoaderPlugin` and threw `'No VRM extension in file'`
// when the GLB carried no `VRMC_*` extension. Issue #36 asks the studio to
// accept TRELLIS-style outputs (plain GLB) and other common formats (FBX,
// PLY, OBJ, MJCF) through a single selector. This module exposes a small
// dispatcher that:
//
//   - sniffs the file format (extension first, HTTP Content-Type fallback,
//     explicit `hint` overrides both) — see `ACS_detectModelFormat` in
//     `constants.js`,
//   - fetches the buffer with `ACS_fetchVRMCached` (re-using the existing
//     in-browser cache so reloads stay snappy),
//   - parses the buffer with the matching three.js loader,
//   - returns a normalized result `{ scene, format, kind, url, vrm? }` so
//     `Editor.jsx` can attach the scene to the stage and (only for VRM
//     humanoids) wire up the humanoid + expression managers.
//
// The dispatcher does NOT mutate the live editor state — it only parses the
// buffer and hands back the parsed scene. Editor.jsx takes the result and
// runs the existing VRM-specific bookkeeping when `result.vrm` is set;
// otherwise it falls back to the new "static prop" rendering path.
//
// Design parity with the GEAR-SONIC integration (issue #31): when a feature
// can't run, the failure is surfaced verbatim in the returned object's
// reason / the thrown Error message. We never substitute a fake result.

(function () {
  // Resolve the configured fetch function (jsdom tests pass their own
  // `fetch`). All loaders fall back to the browser's global fetch.
  function resolveFetch(opts) {
    return opts?.fetch || (typeof fetch !== 'undefined' ? fetch : null);
  }

  async function fetchBuffer(url, opts) {
    const resolved = window.ACS_normalizeModelURL
      ? window.ACS_normalizeModelURL(url)
      : url;
    // Re-use the VRM HTTP cache so loading a 10 MB GLB twice is free. The
    // cache is keyed by URL so it works for any binary model file. When the
    // caller supplies a custom fetch (tests) skip the cache wrapper.
    if (opts?.fetch && opts.fetch !== fetch) {
      const resp = await opts.fetch(resolved);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = typeof resp.arrayBuffer === 'function'
        ? await resp.arrayBuffer()
        : await resp.text();
      return { buf: text, contentType: resp.headers?.get?.('content-type') || '' };
    }
    if (typeof window.ACS_fetchVRMCached === 'function') {
      const buf = await window.ACS_fetchVRMCached(resolved);
      return { buf, contentType: '' };
    }
    const resp = await fetch(resolved);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return { buf: await resp.arrayBuffer(), contentType: resp.headers.get('content-type') || '' };
  }

  // Parse a GLB/glTF buffer with three.js' GLTFLoader. We register the
  // `VRMLoaderPlugin` only when the caller explicitly asks for a VRM (via
  // `format: 'vrm'`); plain GLBs go through the regular GLTFLoader path so
  // the loader does not throw `'No VRM extension in file'` on TRELLIS output.
  async function parseGLB(buf, opts) {
    const GLTFLoaderCtor = opts?.GLTFLoader || window.GLTFLoader;
    if (!GLTFLoaderCtor) throw new Error('GLTFLoader unavailable');
    const loader = new GLTFLoaderCtor();
    if (opts?.asVRM) {
      const VRM = opts?.THREE_VRM || window.THREE_VRM;
      if (!VRM?.VRMLoaderPlugin) throw new Error('VRMLoaderPlugin unavailable');
      loader.register((parser) => new VRM.VRMLoaderPlugin(parser, {
        helperRoot: opts?.springHelperRoot,
        autoUpdateHumanBones: true,
      }));
    }
    return await new Promise((res, rej) => loader.parse(buf, '', res, rej));
  }

  async function parseFBX(buf, opts) {
    const FBXLoaderCtor = opts?.FBXLoader || window.FBXLoader;
    if (!FBXLoaderCtor) throw new Error('FBXLoader unavailable');
    const loader = new FBXLoaderCtor();
    return loader.parse(buf, '');
  }

  async function parsePLY(buf, opts) {
    const PLYLoaderCtor = opts?.PLYLoader || window.PLYLoader;
    if (!PLYLoaderCtor) throw new Error('PLYLoader unavailable');
    const loader = new PLYLoaderCtor();
    const geometry = loader.parse(buf);
    geometry.computeVertexNormals?.();
    const THREE = opts?.THREE || window.THREE;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, metalness: 0.2, roughness: 0.7, vertexColors: !!geometry.attributes?.color,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  async function parseOBJ(buf, opts) {
    const OBJLoaderCtor = opts?.OBJLoader || window.OBJLoader;
    if (!OBJLoaderCtor) throw new Error('OBJLoader unavailable');
    const loader = new OBJLoaderCtor();
    // OBJLoader.parse expects a string. Convert ArrayBuffer → string with
    // TextDecoder (default UTF-8) so this works without DOM helpers.
    const text = (typeof buf === 'string')
      ? buf
      : new TextDecoder('utf-8').decode(new Uint8Array(buf));
    return loader.parse(text);
  }

  // The model-loader dispatcher. Returns:
  //   {
  //     ok: true,
  //     format,   // 'vrm' | 'glb' | 'fbx' | 'ply' | 'obj' | 'mjcf'
  //     kind,     // 'humanoid' (vrm) | 'prop' (glb/fbx/ply/obj) | 'robot' (mjcf)
  //     url,
  //     scene,    // a THREE.Object3D ready to add to stateRef.scene
  //     vrm,      // (vrm only) the parsed @pixiv/three-vrm VRM object
  //     gltf,     // (vrm/glb only) the raw GLTF userData carrier
  //     bodyMap,  // (mjcf only) the named body Object3Ds for joint driving
  //   }
  //
  // On loader failure throws an Error whose .message is shown verbatim in
  // the editor status overlay.
  async function loadModelFromBuffer(buf, format, opts = {}) {
    const fmt = String(format || '').toLowerCase();
    if (!fmt) throw new Error('format is required');
    if (fmt === 'vrm') {
      const gltf = await parseGLB(buf, { ...opts, asVRM: true });
      const VRM = opts?.THREE_VRM || window.THREE_VRM;
      try { VRM.VRMUtils.removeUnnecessaryVertices(gltf.scene); } catch {}
      try { VRM.VRMUtils.combineSkeletons?.(gltf.scene); } catch {}
      try { VRM.VRMUtils.combineMorphs?.(gltf.userData.vrm); } catch {}
      const vrm = gltf.userData.vrm;
      if (!vrm) throw new Error('No VRM extension in file');
      return { ok: true, format: 'vrm', kind: 'humanoid', scene: vrm.scene, vrm, gltf };
    }
    if (fmt === 'glb' || fmt === 'gltf') {
      const gltf = await parseGLB(buf, { ...opts, asVRM: false });
      return { ok: true, format: 'glb', kind: 'prop', scene: gltf.scene, gltf };
    }
    if (fmt === 'fbx') {
      const obj = await parseFBX(buf, opts);
      return { ok: true, format: 'fbx', kind: 'prop', scene: obj };
    }
    if (fmt === 'ply') {
      const obj = await parsePLY(buf, opts);
      return { ok: true, format: 'ply', kind: 'prop', scene: obj };
    }
    if (fmt === 'obj') {
      const obj = await parseOBJ(buf, opts);
      return { ok: true, format: 'obj', kind: 'prop', scene: obj };
    }
    throw new Error(`Format '${fmt}' is not handled by ACS_loadModelFromBuffer`);
  }

  // The URL variant fetches the buffer first, then dispatches by format.
  // For MJCF it skips the buffer step and delegates to the existing GEAR-
  // SONIC robot loader (which fetches scene.xml + STL meshes itself).
  async function loadModelFromURL(url, opts = {}) {
    if (!url) throw new Error('URL is empty');
    let format = opts.format;
    let buf = null;
    let contentType = '';
    if (!format) {
      format = window.ACS_detectModelFormat?.(url, null, null);
    }
    // MJCF: hand off to gearSonic.js — it fetches scene.xml and the STL
    // meshes itself, so we skip the buffer fetch here.
    if (format === 'mjcf') {
      const THREE = opts.THREE || window.THREE;
      if (typeof window.ACS_loadGearSonicRobotModel !== 'function') {
        throw new Error('ACS_loadGearSonicRobotModel unavailable; cannot load MJCF');
      }
      const baseUrl = url.replace(/\/assets\/robot\/scene\.xml$/, '');
      const robot = await window.ACS_loadGearSonicRobotModel(THREE, {
        baseUrl, fetch: opts.fetch, onProgress: opts.onProgress,
      });
      return {
        ok: true,
        format: 'mjcf',
        kind: 'robot',
        url,
        scene: robot.root,
        bodyMap: robot.bodyMap,
        info: robot.info,
      };
    }
    if (!format) {
      // Fetch first so we can read the Content-Type for a final guess.
      const fetched = await fetchBuffer(url, opts);
      buf = fetched.buf;
      contentType = fetched.contentType;
      format = window.ACS_detectModelFormat?.(url, contentType, null);
    } else {
      const fetched = await fetchBuffer(url, opts);
      buf = fetched.buf;
      contentType = fetched.contentType;
    }
    const result = await loadModelFromBuffer(buf, format, opts);
    return { ...result, url, contentType };
  }

  window.ACS_loadModelFromBuffer = loadModelFromBuffer;
  window.ACS_loadModelFromURL = loadModelFromURL;
})();
