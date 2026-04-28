import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// modelLoader.js depends on ACS_normalizeModelURL (constants.js) and on
// ACS_fetchVRMCached (color.js). We import the helpers in setup so the
// dispatcher can use them like it would in the browser.
beforeAll(async () => {
  await import('../public/new/src/constants.js');
  await import('../public/new/src/color.js');
  await import('../public/new/src/modelLoader.js');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ACS_detectModelFormat (issue #36)', () => {
  it('detects format from URL extension', () => {
    expect(window.ACS_detectModelFormat('https://x/foo.vrm')).toBe('vrm');
    expect(window.ACS_detectModelFormat('https://x/foo.glb')).toBe('glb');
    expect(window.ACS_detectModelFormat('https://x/foo.gltf')).toBe('glb');
    expect(window.ACS_detectModelFormat('https://x/foo.fbx')).toBe('fbx');
    expect(window.ACS_detectModelFormat('https://x/foo.ply')).toBe('ply');
    expect(window.ACS_detectModelFormat('https://x/foo.obj')).toBe('obj');
    expect(window.ACS_detectModelFormat('https://x/scene.xml')).toBe('mjcf');
  });

  it('strips query string and fragment before checking the extension', () => {
    expect(window.ACS_detectModelFormat('https://x/foo.glb?token=abc')).toBe(
      'glb'
    );
    expect(window.ACS_detectModelFormat('https://x/foo.vrm#frag')).toBe('vrm');
    expect(window.ACS_detectModelFormat('https://x/foo.PLY?v=1#x')).toBe('ply');
  });

  it('falls back to the Content-Type header when the URL is opaque', () => {
    expect(
      window.ACS_detectModelFormat('https://cdn/share/abc', 'model/gltf-binary')
    ).toBe('glb');
    expect(
      window.ACS_detectModelFormat('https://cdn/share/abc', 'model/gltf+json')
    ).toBe('glb');
    expect(
      window.ACS_detectModelFormat(
        'https://cdn/share/abc',
        'application/octet-stream'
      )
    ).toBe('glb');
    expect(
      window.ACS_detectModelFormat('https://cdn/share/abc', 'model/vrm')
    ).toBe('vrm');
  });

  it('honours an explicit hint over both URL and Content-Type', () => {
    expect(window.ACS_detectModelFormat('https://x/foo.glb', null, 'vrm')).toBe(
      'vrm'
    );
    expect(
      window.ACS_detectModelFormat('https://x/scene.xml', null, 'glb')
    ).toBe('glb');
  });

  it('throws verbatim when nothing matches so the editor surfaces the failure', () => {
    expect(() => window.ACS_detectModelFormat('https://x/foo.unknown')).toThrow(
      /Unknown model format/
    );
  });
});

describe('ACS_loadModelFromBuffer dispatcher (issue #36)', () => {
  it('rejects an empty format', async () => {
    await expect(
      window.ACS_loadModelFromBuffer(new ArrayBuffer(8), '')
    ).rejects.toThrow(/format is required/);
  });

  it('rejects an unhandled format verbatim', async () => {
    await expect(
      window.ACS_loadModelFromBuffer(new ArrayBuffer(8), 'usdz')
    ).rejects.toThrow(/'usdz' is not handled/);
  });

  it('routes glb to GLTFLoader (no VRMLoaderPlugin) — no "No VRM extension" throw', async () => {
    // Stub GLTFLoader so we can assert the dispatcher does NOT register the
    // VRMLoaderPlugin when format is 'glb'. parse() resolves with a fake
    // gltf userData that has no `vrm` field — exactly the shape TRELLIS
    // returns. The legacy loadVRMBuffer would have thrown 'No VRM
    // extension in file'; the dispatcher must NOT.
    const fakeScene = { name: 'fake-scene', traverse() {} };
    const fakeGltf = { scene: fakeScene, userData: {} };
    const register = vi.fn();
    const parse = vi.fn((buf, base, res) => res(fakeGltf));
    class FakeGLTFLoader {
      constructor() {
        this.register = register;
        this.parse = parse;
      }
    }
    const result = await window.ACS_loadModelFromBuffer(
      new ArrayBuffer(8),
      'glb',
      { GLTFLoader: FakeGLTFLoader }
    );
    expect(register).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.format).toBe('glb');
    expect(result.kind).toBe('prop');
    expect(result.scene).toBe(fakeScene);
  });

  it('routes vrm to GLTFLoader with VRMLoaderPlugin registered', async () => {
    const fakeScene = { name: 'fake-vrm-scene', traverse() {} };
    const fakeVRM = { scene: fakeScene, meta: {} };
    const fakeGltf = { scene: fakeScene, userData: { vrm: fakeVRM } };
    const register = vi.fn();
    const parse = vi.fn((buf, base, res) => res(fakeGltf));
    class FakeGLTFLoader {
      constructor() {
        this.register = register;
        this.parse = parse;
      }
    }
    class FakeVRMLoaderPlugin {}
    const fakeVRMUtils = {
      removeUnnecessaryVertices: vi.fn(),
      combineSkeletons: vi.fn(),
      combineMorphs: vi.fn(),
    };
    const result = await window.ACS_loadModelFromBuffer(
      new ArrayBuffer(8),
      'vrm',
      {
        GLTFLoader: FakeGLTFLoader,
        THREE_VRM: {
          VRMLoaderPlugin: FakeVRMLoaderPlugin,
          VRMUtils: fakeVRMUtils,
        },
      }
    );
    expect(register).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.format).toBe('vrm');
    expect(result.kind).toBe('humanoid');
    expect(result.vrm).toBe(fakeVRM);
  });

  it('throws "No VRM extension in file" only when format is vrm and meta is missing', async () => {
    const fakeGltf = { scene: { traverse() {} }, userData: {} }; // no vrm
    const parse = vi.fn((buf, base, res) => res(fakeGltf));
    class FakeGLTFLoader {
      constructor() {
        this.register = () => {};
        this.parse = parse;
      }
    }
    class FakeVRMLoaderPlugin {}
    const fakeVRMUtils = {
      removeUnnecessaryVertices: vi.fn(),
      combineSkeletons: vi.fn(),
      combineMorphs: vi.fn(),
    };
    await expect(
      window.ACS_loadModelFromBuffer(new ArrayBuffer(8), 'vrm', {
        GLTFLoader: FakeGLTFLoader,
        THREE_VRM: {
          VRMLoaderPlugin: FakeVRMLoaderPlugin,
          VRMUtils: fakeVRMUtils,
        },
      })
    ).rejects.toThrow(/No VRM extension in file/);
  });

  it('routes fbx to FBXLoader.parse', async () => {
    const fakeObj = { name: 'fake-fbx', traverse() {} };
    const parse = vi.fn(() => fakeObj);
    class FakeFBXLoader {
      constructor() {
        this.parse = parse;
      }
    }
    const result = await window.ACS_loadModelFromBuffer(
      new ArrayBuffer(8),
      'fbx',
      { FBXLoader: FakeFBXLoader }
    );
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.format).toBe('fbx');
    expect(result.kind).toBe('prop');
    expect(result.scene).toBe(fakeObj);
  });

  it('routes obj through OBJLoader (string buffer goes straight through)', async () => {
    const text = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
    const fakeObj = { name: 'fake-obj' };
    const parse = vi.fn((t) => {
      expect(t).toContain('f 1 2 3');
      return fakeObj;
    });
    class FakeOBJLoader {
      constructor() {
        this.parse = parse;
      }
    }
    const result = await window.ACS_loadModelFromBuffer(text, 'obj', {
      OBJLoader: FakeOBJLoader,
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.format).toBe('obj');
    expect(result.scene).toBe(fakeObj);
  });
});

describe('ACS_loadModelFromURL routing (issue #36)', () => {
  it('routes mjcf URLs to ACS_loadGearSonicRobotModel', async () => {
    const original = window.ACS_loadGearSonicRobotModel;
    const fakeRoot = { name: 'g1' };
    const stub = vi.fn(async () => ({
      root: fakeRoot,
      bodyMap: { pelvis: {} },
      info: { sceneURL: 'x' },
    }));
    window.ACS_loadGearSonicRobotModel = stub;
    try {
      const result = await window.ACS_loadModelFromURL(
        'https://nvlabs.github.io/GEAR-SONIC/assets/robot/scene.xml',
        { THREE: {}, fetch: () => {} }
      );
      expect(stub).toHaveBeenCalledTimes(1);
      expect(result.format).toBe('mjcf');
      expect(result.kind).toBe('robot');
      expect(result.scene).toBe(fakeRoot);
    } finally {
      window.ACS_loadGearSonicRobotModel = original;
    }
  });

  it('detects format from URL when none is given', async () => {
    // Use a fetch stub that returns something the GLB branch can parse —
    // the test only cares that the dispatcher reaches the GLB branch.
    const fakeBuf = new ArrayBuffer(8);
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => fakeBuf,
      headers: { get: () => 'model/gltf-binary' },
    }));
    const fakeScene = { traverse() {} };
    const fakeGltf = { scene: fakeScene, userData: {} };
    class FakeGLTFLoader {
      constructor() {
        this.register = () => {};
        this.parse = (buf, base, res) => res(fakeGltf);
      }
    }
    const result = await window.ACS_loadModelFromURL(
      'https://example.test/foo.glb',
      { fetch: fakeFetch, GLTFLoader: FakeGLTFLoader }
    );
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(result.format).toBe('glb');
    expect(result.url).toBe('https://example.test/foo.glb');
  });

  it('rewrites GitHub blob URLs through ACS_normalizeModelURL', async () => {
    // The dispatcher delegates URL rewriting to ACS_normalizeModelURL — the
    // same helper the legacy VRM loader used. Asserting the rewritten URL
    // gets passed to fetch verifies the same hook still runs.
    const fakeBuf = new ArrayBuffer(8);
    const fakeFetch = vi.fn(async (url) => {
      expect(url).toBe('https://raw.githubusercontent.com/foo/bar/main/x.glb');
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => fakeBuf,
        headers: { get: () => 'application/octet-stream' },
      };
    });
    class FakeGLTFLoader {
      constructor() {
        this.register = () => {};
        this.parse = (buf, base, res) =>
          res({ scene: { traverse() {} }, userData: {} });
      }
    }
    await window.ACS_loadModelFromURL(
      'https://github.com/foo/bar/blob/main/x.glb',
      { fetch: fakeFetch, GLTFLoader: FakeGLTFLoader }
    );
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});

describe('ACS_MODEL_PRESETS / ACS_VRM_PRESETS alias (issue #36)', () => {
  it('every preset entry has a format and a kind', () => {
    expect(Array.isArray(window.ACS_MODEL_PRESETS)).toBe(true);
    expect(window.ACS_MODEL_PRESETS.length).toBeGreaterThan(0);
    for (const p of window.ACS_MODEL_PRESETS) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(typeof p.url).toBe('string');
      expect(typeof p.format).toBe('string');
      expect(typeof p.kind).toBe('string');
    }
  });

  it('ACS_VRM_PRESETS exposes only VRM entries (backwards-compat alias)', () => {
    expect(Array.isArray(window.ACS_VRM_PRESETS)).toBe(true);
    expect(window.ACS_VRM_PRESETS.length).toBeGreaterThan(0);
    for (const p of window.ACS_VRM_PRESETS) {
      expect(p.format).toBe('vrm');
    }
  });

  it('MODEL_PRESETS includes at least one non-VRM entry so the dispatcher path is covered', () => {
    const formats = new Set(window.ACS_MODEL_PRESETS.map((p) => p.format));
    expect(formats.has('vrm')).toBe(true);
    // Issue #36 asks for multi-format presets — make sure at least one non-
    // VRM entry ships so QA can verify the dispatcher without TRELLIS.
    expect(formats.size).toBeGreaterThan(1);
  });
});
