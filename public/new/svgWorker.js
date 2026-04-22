// SVG projection worker.
// Receives per-mesh transformed triangle vertices (world-space) + per-mesh color.
// Returns an SVG string. Main thread sends only when worker is idle (back-pressure).

let busy = false;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type !== 'render') return;
  if (busy) { self.postMessage({ type: 'dropped' }); return; }
  busy = true;
  try {
    const svg = render(msg);
    self.postMessage({ type: 'svg', svg, frameId: msg.frameId });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err.message || err), frameId: msg.frameId });
  } finally {
    busy = false;
  }
};

function render({ meshes, camPos, camMatrix, viewW, viewH, bg, stroke, strokeWidth }) {
  const w = viewW, h = viewH;
  const paths = [];

  for (const mesh of meshes) {
    const { positions, color, opacity } = mesh; // positions: Float32Array xyz per vertex, triangles = positions.length/9
    const triCount = positions.length / 9;
    for (let t = 0; t < triCount; t++) {
      const o = t * 9;
      const ax = positions[o],   ay = positions[o+1], az = positions[o+2];
      const bx = positions[o+3], by = positions[o+4], bz = positions[o+5];
      const cx = positions[o+6], cy = positions[o+7], cz = positions[o+8];

      // Back-face cull (same orientation as main-thread projection)
      const e1x = bx-ax, e1y = by-ay, e1z = bz-az;
      const e2x = cx-ax, e2y = cy-ay, e2z = cz-az;
      const nx = e1y*e2z - e1z*e2y;
      const ny = e1z*e2x - e1x*e2z;
      const nz = e1x*e2y - e1y*e2x;
      const vx = camPos[0]-ax, vy = camPos[1]-ay, vz = camPos[2]-az;
      if (nx*vx + ny*vy + nz*vz <= 0) continue;

      const avgZ = (az + bz + cz) / 3;

      // Project a,b,c with camMatrix (16 floats, column-major three.js Matrix4.elements).
      const paX = proj(camMatrix, ax, ay, az, 0);
      const paY = proj(camMatrix, ax, ay, az, 1);
      const paW = proj(camMatrix, ax, ay, az, 3);
      const pbX = proj(camMatrix, bx, by, bz, 0);
      const pbY = proj(camMatrix, bx, by, bz, 1);
      const pbW = proj(camMatrix, bx, by, bz, 3);
      const pcX = proj(camMatrix, cx, cy, cz, 0);
      const pcY = proj(camMatrix, cx, cy, cz, 1);
      const pcW = proj(camMatrix, cx, cy, cz, 3);

      const ax_ = paX/paW, ay_ = paY/paW;
      const bx_ = pbX/pbW, by_ = pbY/pbW;
      const cx_ = pcX/pcW, cy_ = pcY/pcW;
      const sax = (ax_*0.5+0.5)*w, say = (1-(ay_*0.5+0.5))*h;
      const sbx = (bx_*0.5+0.5)*w, sby = (1-(by_*0.5+0.5))*h;
      const scx = (cx_*0.5+0.5)*w, scy = (1-(cy_*0.5+0.5))*h;

      // Cheap viewport reject
      const minX = Math.min(sax, sbx, scx), maxX = Math.max(sax, sbx, scx);
      const minY = Math.min(say, sby, scy), maxY = Math.max(say, sby, scy);
      if (maxX < 0 || minX > w || maxY < 0 || minY > h) continue;

      const d = `M${sax.toFixed(1)},${say.toFixed(1)} L${sbx.toFixed(1)},${sby.toFixed(1)} L${scx.toFixed(1)},${scy.toFixed(1)} Z`;
      paths.push({ d, fill: color, opacity: opacity ?? 1, z: avgZ });
    }
  }

  paths.sort((a, b) => a.z - b.z);

  // merge adjacent same-fill+same-opacity runs
  const merged = [];
  for (const p of paths) {
    const last = merged[merged.length - 1];
    if (last && last.fill === p.fill && last.opacity === p.opacity) last.d += ' ' + p.d;
    else merged.push({ ...p });
  }
  const strokeAttr = strokeWidth > 0.01 ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  const body = merged.map(p => {
    const opAttr = p.opacity < 0.995 ? ` fill-opacity="${p.opacity.toFixed(3)}"` : '';
    return `<path d="${p.d}" fill="${p.fill}"${opAttr}${strokeAttr}/>`;
  }).join('');
  // No explicit width/height — container scales via viewBox + preserveAspectRatio.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
}

// Column-major Matrix4: e[0..3] = col0, e[4..7] = col1, etc. Vector is (x,y,z,1).
function proj(m, x, y, z, comp) {
  return m[comp] * x + m[4+comp] * y + m[8+comp] * z + m[12+comp];
}
