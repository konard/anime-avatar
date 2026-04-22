// svg.js — main-thread SVG projection + worker snapshot builder.

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Project every mesh triangle to 2D, back-face cull, depth sort, merge same-color runs.
  // Runs on the main thread; used by download and test harness.
  window.ACS_vrmToSVG = function vrmToSVG(vrm, camera, THREE, opts) {
    const w = opts.width || 900;
    const h = opts.height || 1200;
    const bg = opts.bg || '#0b0818';
    const stroke = opts.stroke || '#000';
    const strokeWidth = opts.strokeWidth || 0;
    const quality = clamp(opts.quality ?? 1, 0.1, 1);

    if (!vrm) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="${bg}"/></svg>`;
    }

    vrm.scene.updateMatrixWorld(true);
    const camMatrix = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
    const paths = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();

    vrm.scene.traverse(mesh => {
      if (!mesh.isMesh && !mesh.isSkinnedMesh) return;
      if (mesh.visible === false) return;
      const geom = mesh.geometry;
      if (!geom || !geom.attributes?.position) return;
      const pos = geom.attributes.position;
      const index = geom.index;
      const triCount = index ? index.count / 3 : pos.count / 3;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const color = window.ACS_deriveRepresentativeColor(mat);
      const opacity = (mat && mat.transparent) ? (mat.opacity ?? 1) : 1;

      const getVertex = (i, out) => {
        if (mesh.isSkinnedMesh && mesh.boneTransform) {
          out.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          mesh.boneTransform(i, out);
          out.applyMatrix4(mesh.matrixWorld);
        } else {
          out.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          out.applyMatrix4(mesh.matrixWorld);
        }
      };

      const maxTris = Math.round(9000 * quality);
      const step = Math.max(1, Math.ceil(triCount / maxTris));

      for (let t = 0; t < triCount; t += step) {
        const a = index ? index.getX(t*3) : t*3;
        const b = index ? index.getX(t*3+1) : t*3+1;
        const c = index ? index.getX(t*3+2) : t*3+2;
        getVertex(a, va); getVertex(b, vb); getVertex(c, vc);

        const e1x = vb.x-va.x, e1y = vb.y-va.y, e1z = vb.z-va.z;
        const e2x = vc.x-va.x, e2y = vc.y-va.y, e2z = vc.z-va.z;
        const nx = e1y*e2z - e1z*e2y, ny = e1z*e2x - e1x*e2z, nz = e1x*e2y - e1y*e2x;
        const vx = camera.position.x - va.x, vy = camera.position.y - va.y, vz = camera.position.z - va.z;
        if (nx*vx + ny*vy + nz*vz <= 0) continue;

        const avgZ = (va.z + vb.z + vc.z) / 3;
        const pa = va.clone().applyMatrix4(camMatrix);
        const pb = vb.clone().applyMatrix4(camMatrix);
        const pc = vc.clone().applyMatrix4(camMatrix);
        const sx = (v) => (v.x * 0.5 + 0.5) * w;
        const sy = (v) => (1 - (v.y * 0.5 + 0.5)) * h;
        const xs = [sx(pa), sx(pb), sx(pc)], ys = [sy(pa), sy(pb), sy(pc)];
        if (Math.max(...xs) < 0 || Math.min(...xs) > w) continue;
        if (Math.max(...ys) < 0 || Math.min(...ys) > h) continue;
        const d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)} L${xs[1].toFixed(1)},${ys[1].toFixed(1)} L${xs[2].toFixed(1)},${ys[2].toFixed(1)} Z`;
        paths.push({ d, fill: color, opacity, z: avgZ });
      }
    });

    paths.sort((a, b) => a.z - b.z);
    const merged = [];
    for (const p of paths) {
      const last = merged[merged.length - 1];
      if (last && last.fill === p.fill && last.opacity === p.opacity) last.d += ' ' + p.d;
      else merged.push({ ...p });
    }
    const strokeAttr = strokeWidth > 0.01 ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
    const pathMarkup = merged.map(p => {
      const opAttr = p.opacity < 0.995 ? ` fill-opacity="${p.opacity.toFixed(3)}"` : '';
      return `<path d="${p.d}" fill="${p.fill}"${opAttr}${strokeAttr}/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="${bg}"/>${pathMarkup}</svg>`;
  };

  window.ACS_buildSVG = function buildSVG(s, c) {
    if (!s.vrm || !s.THREE) return '';
    const THREE = s.THREE;
    const camSvg = new THREE.PerspectiveCamera(c.svgCamFov, c.svgWidth/c.svgHeight, 0.1, 50);
    const dist = c.svgCamDist;
    const yawR = c.svgYaw * Math.PI / 180, pitchR = c.svgPitch * Math.PI / 180;
    camSvg.position.set(
      Math.sin(yawR) * Math.cos(pitchR) * dist,
      c.svgCamHeight + Math.sin(pitchR) * dist,
      Math.cos(yawR) * Math.cos(pitchR) * dist,
    );
    camSvg.lookAt(0, c.svgCamHeight, 0);
    camSvg.updateProjectionMatrix();
    camSvg.updateMatrixWorld(true);
    return window.ACS_vrmToSVG(s.vrm, camSvg, THREE, {
      width: c.svgWidth, height: c.svgHeight,
      bg: c.svgBg, stroke: c.svgStroke, strokeWidth: c.svgStrokeWidth, quality: c.svgQuality,
    });
  };

  // Worker-ready snapshot: skinned world-space triangles + color + opacity per mesh.
  window.ACS_snapshotForWorker = function snapshotForWorker(s, c) {
    const THREE = s.THREE;
    const vrm = s.vrm;
    if (!vrm) return null;
    vrm.scene.updateMatrixWorld(true);
    const camSvg = new THREE.PerspectiveCamera(c.svgCamFov, (c.svgWidth||900)/(c.svgHeight||1200), 0.1, 50);
    const dist = c.svgCamDist;
    const yawR = (c.svgYaw || 0) * Math.PI / 180;
    const pitchR = (c.svgPitch || 0) * Math.PI / 180;
    camSvg.position.set(
      Math.sin(yawR) * Math.cos(pitchR) * dist,
      c.svgCamHeight + Math.sin(pitchR) * dist,
      Math.cos(yawR) * Math.cos(pitchR) * dist,
    );
    camSvg.lookAt(0, c.svgCamHeight, 0);
    camSvg.updateProjectionMatrix();
    camSvg.updateMatrixWorld(true);

    const meshes = [];
    const vTmp = new THREE.Vector3();

    vrm.scene.traverse(mesh => {
      if (!mesh.isMesh && !mesh.isSkinnedMesh) return;
      if (mesh.visible === false) return;
      const geom = mesh.geometry;
      if (!geom?.attributes?.position) return;
      const pos = geom.attributes.position;
      const index = geom.index;
      const triCount = index ? index.count / 3 : pos.count / 3;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const color = window.ACS_deriveRepresentativeColor(mat);
      const opacity = (mat && mat.transparent) ? (mat.opacity ?? 1) : 1;

      const maxTris = Math.round(4500 * (c.svgQuality ?? 0.5));
      const step = Math.max(1, Math.ceil(triCount / maxTris));
      const kept = Math.ceil(triCount / step);
      const positions = new Float32Array(kept * 9);
      let o = 0;

      for (let t = 0; t < triCount; t += step) {
        const a = index ? index.getX(t*3) : t*3;
        const b = index ? index.getX(t*3+1) : t*3+1;
        const cx = index ? index.getX(t*3+2) : t*3+2;
        getWorldVertex(mesh, pos, a, vTmp); positions[o++] = vTmp.x; positions[o++] = vTmp.y; positions[o++] = vTmp.z;
        getWorldVertex(mesh, pos, b, vTmp); positions[o++] = vTmp.x; positions[o++] = vTmp.y; positions[o++] = vTmp.z;
        getWorldVertex(mesh, pos, cx, vTmp); positions[o++] = vTmp.x; positions[o++] = vTmp.y; positions[o++] = vTmp.z;
      }
      meshes.push({ positions: positions.slice(0, o), color, opacity });
    });

    return {
      meshes,
      camPos: [camSvg.position.x, camSvg.position.y, camSvg.position.z],
      camMatrix: Array.from(camSvg.projectionMatrix.clone().multiply(camSvg.matrixWorldInverse).elements),
      viewW: c.svgWidth || 900,
      viewH: c.svgHeight || 1200,
      bg: c.svgBg || '#0b0818',
      stroke: c.svgStroke || '#000000',
      strokeWidth: c.svgStrokeWidth || 0,
    };
  };

  function getWorldVertex(mesh, pos, i, out) {
    out.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (mesh.isSkinnedMesh && mesh.boneTransform) mesh.boneTransform(i, out);
    out.applyMatrix4(mesh.matrixWorld);
  }
})();
