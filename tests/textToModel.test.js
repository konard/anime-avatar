import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('../public/new/src/textToModel.js');
});

// Synthetic GLB-shaped ArrayBuffer. The client only checks byteLength so a
// 16-byte buffer is enough; tests don't need a real GLB header.
const FAKE_GLB_BUFFER = new ArrayBuffer(16);

describe('ACS_TEXT_TO_MODEL_PROVIDERS (issue #36)', () => {
  it('exposes the trellis text + image + gradio + nim provider templates', () => {
    expect(Array.isArray(window.ACS_TEXT_TO_MODEL_PROVIDERS)).toBe(true);
    const ids = window.ACS_TEXT_TO_MODEL_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('trellis-text');
    expect(ids).toContain('trellis-image');
    expect(ids).toContain('gradio-space');
    expect(ids).toContain('nvidia-nim');
  });

  it('records the required input fields per provider', () => {
    const text = window.ACS_TEXT_TO_MODEL_PROVIDERS.find(
      (p) => p.id === 'trellis-text'
    );
    expect(text.inputs).toContain('prompt');
    const image = window.ACS_TEXT_TO_MODEL_PROVIDERS.find(
      (p) => p.id === 'trellis-image'
    );
    expect(image.inputs).toContain('imageUrl');
  });
});

describe('ACS_generateModelFromText backend client (issue #36)', () => {
  it('reports no-backend when the URL is empty', async () => {
    const result = await window.ACS_generateModelFromText('a robot ninja', {
      backendURL: '',
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('no-backend');
    expect(result.reason).toMatch(/text-to-model backend/i);
  });

  it('reports empty-prompt for prompt-driven providers when prompt is missing', async () => {
    const result = await window.ACS_generateModelFromText('', {
      backendURL: 'https://x',
      providerId: 'trellis-text',
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('empty-prompt');
  });

  it('reports empty-image for trellis-image when imageUrl is missing', async () => {
    const result = await window.ACS_generateModelFromText('', {
      backendURL: 'https://x',
      providerId: 'trellis-image',
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('empty-image');
    expect(result.reason).toMatch(/image url/i);
  });

  it('POSTs to the configured backend and returns the GLB on success', async () => {
    const fakeFetch = vi.fn(async (url, init) => {
      expect(url).toBe('https://example.test/api/generate');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.prompt).toBe('cyberpunk catgirl');
      expect(body.provider).toBe('trellis-text');
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'model/gltf-binary' },
        arrayBuffer: async () => FAKE_GLB_BUFFER,
      };
    });
    const result = await window.ACS_generateModelFromText('cyberpunk catgirl', {
      backendURL: 'https://example.test',
      providerId: 'trellis-text',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('glb');
    expect(result.providerId).toBe('trellis-text');
    expect(result.glb).toBe(FAKE_GLB_BUFFER);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it('reports backend HTTP errors verbatim with status + detail', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: { get: () => 'application/json' },
      json: async () => ({ detail: 'GPU OOM' }),
    }));
    const result = await window.ACS_generateModelFromText('x', {
      backendURL: 'https://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('backend-error');
    expect(result.reason).toContain('503');
    expect(result.reason).toContain('GPU OOM');
  });

  it('reports network errors verbatim', async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error('fetch boom');
    });
    const result = await window.ACS_generateModelFromText('x', {
      backendURL: 'https://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('network-error');
    expect(result.reason).toContain('fetch boom');
  });

  it('follows the JSON glb_url field when the backend returns JSON', async () => {
    const calls = [];
    const fakeFetch = vi.fn(async (url) => {
      calls.push(url);
      if (url === 'https://example.test/api/generate') {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ glb_url: 'https://cdn.example/result.glb' }),
        };
      }
      if (url === 'https://cdn.example/result.glb') {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'model/gltf-binary' },
          arrayBuffer: async () => FAKE_GLB_BUFFER,
          statusText: 'OK',
        };
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    const result = await window.ACS_generateModelFromText('robot', {
      backendURL: 'https://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(true);
    expect(result.sourceURL).toBe('https://cdn.example/result.glb');
    expect(calls).toHaveLength(2);
  });

  it('reports bad-payload when the JSON response is missing glb_url', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ detail: 'no glb here' }),
    }));
    const result = await window.ACS_generateModelFromText('robot', {
      backendURL: 'https://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('bad-payload');
  });

  it('reports bad-payload when the binary response is empty', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'model/gltf-binary' },
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    const result = await window.ACS_generateModelFromText('robot', {
      backendURL: 'https://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('bad-payload');
    expect(result.reason).toMatch(/empty/i);
  });
});
