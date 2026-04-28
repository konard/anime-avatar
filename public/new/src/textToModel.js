// textToModel.js — text-to-model backend client for issue #36.
//
// TRELLIS / TRELLIS.2 are server-side models (≥16 GB GPU, Linux + CUDA — see
// https://github.com/microsoft/TRELLIS and https://github.com/microsoft/TRELLIS.2)
// so the studio cannot run inference in the browser. This module mirrors the
// GEAR-SONIC `/api/generate` integration: a small, off-by-default HTTP client
// that POSTs `{prompt, …}` to a user-configured backend and either receives
// the resulting GLB or surfaces the failure verbatim. Nothing here is fake;
// when the URL is empty the call returns `{ status: 'no-backend' }` so the
// UI can explain what's required.
//
// Output of every backend in the provider list is a GLB ArrayBuffer. The
// editor pipes the buffer straight into `ACS_loadModelFromBuffer(buf, 'glb')`
// so generated meshes load through the same dispatcher used for static
// presets.
//
// Public API:
//   ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL  default backend URL (empty by default)
//   ACS_TEXT_TO_MODEL_PROVIDERS            list of provider templates
//   ACS_generateModelFromText(prompt, opts) HTTP client
//
// Tests: tests/textToModel.test.js exercises the no-backend / HTTP-error /
// OK / network-error paths with a stubbed fetch.

(function () {
  // Empty default — no URL is hard-coded. Users supply their own backend
  // (self-hosted TRELLIS / a Hugging Face Space they trust / NVIDIA NIM).
  window.ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL = '';

  // Provider templates surfaced in the UI. Each entry documents what the
  // backend accepts (`inputs`) and what shape it produces (`output`). The
  // UI selects which prompt fields to render based on `inputs`.
  //
  //   trellis-text   — original TRELLIS text→3D variants
  //                    (https://github.com/microsoft/TRELLIS)
  //   trellis-image  — TRELLIS.2 image→3D
  //                    (https://github.com/microsoft/TRELLIS.2)
  //   gradio-space   — call any Hugging Face Gradio Space via the JS client
  //                    (https://www.gradio.app/docs/js-client)
  //   nvidia-nim     — NVIDIA NIM TRELLIS managed endpoint
  //                    (https://build.nvidia.com/microsoft/trellis/modelcard)
  //   custom         — anything else; we just POST {prompt} to /api/generate
  window.ACS_TEXT_TO_MODEL_PROVIDERS = [
    {
      id: 'trellis-text',
      label: 'TRELLIS text→3D (Microsoft, MIT)',
      endpoint: '/api/generate',
      inputs: ['prompt'],
      output: 'glb',
      credit: 'Microsoft Research',
      license: 'MIT',
      docs: 'https://github.com/microsoft/TRELLIS',
    },
    {
      id: 'trellis-image',
      label: 'TRELLIS.2 image→3D (Microsoft, MIT)',
      endpoint: '/api/generate',
      inputs: ['imageUrl'],
      output: 'glb',
      credit: 'Microsoft Research',
      license: 'MIT',
      docs: 'https://github.com/microsoft/TRELLIS.2',
    },
    {
      id: 'gradio-space',
      label: 'Hugging Face Gradio Space (URL configurable)',
      endpoint: '/api/generate',
      inputs: ['prompt'],
      output: 'glb',
      docs: 'https://www.gradio.app/docs/js-client',
    },
    {
      id: 'nvidia-nim',
      label: 'NVIDIA NIM TRELLIS',
      endpoint: '/v1/infer',
      inputs: ['imageUrl'],
      output: 'glb',
      docs: 'https://build.nvidia.com/microsoft/trellis/modelcard',
    },
    {
      id: 'custom',
      label: 'Custom backend',
      endpoint: '/api/generate',
      inputs: ['prompt'],
      output: 'glb',
    },
  ];

  function findProvider(id) {
    return (window.ACS_TEXT_TO_MODEL_PROVIDERS || []).find((p) => p.id === id);
  }

  // POST `{prompt, …}` to the configured backend and return the result.
  // Shapes (mirroring ACS_generateGearSonicMotion in gearSonic.js):
  //   { ok:false, status:'no-backend',   reason:'…' }
  //   { ok:false, status:'empty-prompt', reason:'…' }
  //   { ok:false, status:'no-fetch',     reason:'…' }
  //   { ok:false, status:'backend-error',reason:'Backend HTTP <code>: <detail>' }
  //   { ok:false, status:'bad-payload',  reason:'…' }
  //   { ok:false, status:'network-error',reason:String(err) }
  //   { ok:true,  status:'ready', prompt, providerId, glb:ArrayBuffer,
  //               format:'glb', sizeBytes, durationMs, sourceURL }
  async function generateModelFromText(prompt, opts = {}) {
    const url = (opts.backendURL || window.ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL || '').trim();
    const providerId = opts.providerId || 'trellis-text';
    const provider = findProvider(providerId) || findProvider('custom');
    if (!url) {
      return {
        ok: false,
        status: 'no-backend',
        prompt,
        providerId,
        reason:
          'No text-to-model backend configured. TRELLIS / TRELLIS.2 cannot run in the browser; ' +
          'point ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL (or this section\'s Backend URL field) ' +
          'at a self-hosted /api/generate endpoint, a Hugging Face Space, or NVIDIA NIM.',
      };
    }
    if (provider.inputs.includes('prompt') && !prompt) {
      return { ok: false, status: 'empty-prompt', prompt, providerId, reason: 'Prompt is empty.' };
    }
    if (provider.inputs.includes('imageUrl') && !opts.imageUrl) {
      return {
        ok: false,
        status: 'empty-image',
        prompt,
        providerId,
        reason: `${provider.label} requires an image URL — set the "Image URL" field.`,
      };
    }
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
      return { ok: false, status: 'no-fetch', prompt, providerId, reason: 'fetch unavailable in this environment.' };
    }
    const endpoint = (opts.endpoint || provider.endpoint || '/api/generate').replace(/^\//, '');
    const target = url.replace(/\/$/, '') + '/' + endpoint;
    const body = {
      prompt,
      provider: providerId,
      ...(provider.inputs.includes('imageUrl') ? { image_url: opts.imageUrl } : {}),
      ...(opts.seed != null ? { seed: opts.seed } : {}),
      ...(opts.steps != null ? { steps: opts.steps } : {}),
      ...(opts.guidance != null ? { guidance: opts.guidance } : {}),
    };
    const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let resp;
    try {
      resp = await fetchFn(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return { ok: false, status: 'network-error', prompt, providerId, reason: String(e?.message || e) };
    }
    if (!resp.ok) {
      let detail = resp.statusText || '';
      try { detail = (await resp.json())?.detail || detail; } catch {}
      return {
        ok: false,
        status: 'backend-error',
        prompt,
        providerId,
        reason: `Backend HTTP ${resp.status}: ${detail}`,
      };
    }
    // Two response shapes are accepted, mirroring how Gradio Spaces /
    // self-hosted servers commonly answer:
    //   1. binary: Content-Type: model/gltf-binary (or application/octet-
    //      stream) with a GLB body.
    //   2. JSON  : { glb_url: 'https://…/result.glb' }  — server uploaded
    //      the GLB elsewhere and only returned a URL.
    const ct = (resp.headers?.get?.('content-type') || '').toLowerCase();
    let glb = null;
    let sourceURL = target;
    try {
      if (ct.includes('json')) {
        const data = await resp.json();
        const glbURL = data?.glb_url || data?.glbUrl || data?.url || '';
        if (!glbURL) {
          return {
            ok: false,
            status: 'bad-payload',
            prompt,
            providerId,
            reason: 'Backend JSON response missing glb_url / glbUrl / url field.',
          };
        }
        const glbResp = await fetchFn(glbURL);
        if (!glbResp.ok) {
          return {
            ok: false,
            status: 'backend-error',
            prompt,
            providerId,
            reason: `GLB fetch HTTP ${glbResp.status}: ${glbResp.statusText || ''}`,
          };
        }
        glb = await glbResp.arrayBuffer();
        sourceURL = glbURL;
      } else {
        glb = await resp.arrayBuffer();
      }
    } catch (e) {
      return { ok: false, status: 'bad-payload', prompt, providerId, reason: String(e?.message || e) };
    }
    if (!glb || (typeof glb.byteLength === 'number' && glb.byteLength === 0)) {
      return {
        ok: false,
        status: 'bad-payload',
        prompt,
        providerId,
        reason: 'Backend returned an empty GLB.',
      };
    }
    const durationMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
    return {
      ok: true,
      status: 'ready',
      prompt,
      providerId,
      provider,
      glb,
      format: 'glb',
      sizeBytes: glb.byteLength || 0,
      durationMs,
      sourceURL,
    };
  }

  window.ACS_generateModelFromText = generateModelFromText;
})();
