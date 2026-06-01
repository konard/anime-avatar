// color.js — material color derivation + VRM fetch cache.

(function () {
  const _texColorCache = new WeakMap();

  // Derive a representative color for a material. MToon's .color is often white
  // because the real color lives in .map (texture) or .shadeColorFactor.
  // Order: .color → shadeColorFactor → average 8×8 of .map → #cccccc.
  window.ACS_deriveRepresentativeColor = function deriveRepresentativeColor(m) {
    if (!m) return '#cccccc';
    const isWhiteish = (c) => c && c.r > 0.92 && c.g > 0.92 && c.b > 0.92;
    if (m.color && !isWhiteish(m.color)) return '#' + m.color.getHexString();
    if (m.shadeColorFactor && !isWhiteish(m.shadeColorFactor)) return '#' + m.shadeColorFactor.getHexString();

    const map = m.map;
    if (map && map.image) {
      const cached = _texColorCache.get(map);
      if (cached) return cached;
      try {
        const img = map.image;
        const w = img.width || img.naturalWidth || 0;
        const h = img.height || img.naturalHeight || 0;
        if (w > 0 && h > 0) {
          const cvs = document.createElement('canvas');
          cvs.width = 8; cvs.height = 8;
          const ctx = cvs.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 8, 8);
          const d = ctx.getImageData(0, 0, 8, 8).data;
          let r = 0, g = 0, b = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 16) continue; // skip transparent
            r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
          }
          if (n > 0) {
            r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
            const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
            _texColorCache.set(map, hex);
            return hex;
          }
        }
      } catch (e) { /* cross-origin texture etc. */ }
    }
    if (m.color) return '#' + m.color.getHexString();
    return '#cccccc';
  };

  // Cache-backed VRM fetcher. Avoids re-downloading 10 MB across reloads.
  window.ACS_fetchVRMCached = async function fetchVRMCached(url) {
    try {
      if ('caches' in window) {
        const cache = await caches.open('acs-vrm-v1');
        const hit = await cache.match(url);
        if (hit) return await hit.arrayBuffer();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        try { await cache.put(url, res.clone()); } catch {}
        return await res.arrayBuffer();
      }
    } catch (e) {
      console.warn('VRM cache miss/fail, direct fetch:', e.message);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  };
})();
