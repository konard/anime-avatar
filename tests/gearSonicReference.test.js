import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  // Load gearSonic.js which attaches helpers to window.
  await import('../public/new/src/gearSonic.js');
});

afterEach(() => {
  window.ACS_clearGearSonicReferenceCache?.();
});

const SAMPLE_MOTION = {
  name: 'squat_001__A359',
  display: 'Squat',
  fps: 50,
  frames: 4,
  // 29-DOF G1 joint positions per frame. Real GEAR-SONIC clips have hundreds
  // of frames; four is plenty for the retargeter test.
  joint_pos: [
    new Array(29).fill(0).map((_, i) => 0.1 * i),
    new Array(29).fill(0).map((_, i) => 0.2 * i),
    new Array(29).fill(0).map((_, i) => 0.3 * i),
    new Array(29).fill(0).map((_, i) => 0.4 * i),
  ],
  root_pos: [
    [0, 0, 0.79],
    [0.1, 0, 0.79],
    [0.2, 0, 0.79],
    [0.3, 0, 0.79],
  ],
  root_quat: [
    [1, 0, 0, 0],
    [0.9999, 0, 0, 0.014],
    [0.9998, 0, 0, 0.02],
    [0.9997, 0, 0, 0.024],
  ],
};

describe('GEAR-SONIC reference motion integration', () => {
  it('exposes the public reference index from the demo', () => {
    expect(Array.isArray(window.ACS_GEAR_SONIC_REFERENCE_INDEX)).toBe(true);
    const ids = window.ACS_GEAR_SONIC_REFERENCE_INDEX.map((m) => m.id);
    expect(ids).toContain('squat_001__A359');
    expect(ids).toContain('walking_quip_360_R_002__A428');
  });

  it('fetches a reference motion from the configured base URL', async () => {
    const fakeFetch = vi.fn(async (url) => {
      expect(url).toBe(
        'https://nvlabs.github.io/GEAR-SONIC/assets/motions/squat_001__A359.json'
      );
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => SAMPLE_MOTION,
      };
    });
    const motion = await window.ACS_fetchGearSonicReferenceMotion(
      'squat_001__A359',
      {
        fetch: fakeFetch,
      }
    );
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(motion.frames).toBe(4);
    expect(motion.fps).toBe(50);
    expect(motion.jointPos.length).toBe(4);
    expect(motion.jointPos[0].length).toBe(29);
    expect(motion.rootQuat[0]).toEqual([1, 0, 0, 0]);
    expect(motion.sourceURL).toMatch(/squat_001__A359\.json$/);
  });

  it('caches a fetched motion so the second call does not hit the network', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => SAMPLE_MOTION,
    }));
    await window.ACS_fetchGearSonicReferenceMotion('squat_001__A359', {
      fetch: fakeFetch,
    });
    await window.ACS_fetchGearSonicReferenceMotion('squat_001__A359', {
      fetch: fakeFetch,
    });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it('reports HTTP failures with the original status code', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));
    await expect(
      window.ACS_fetchGearSonicReferenceMotion('does_not_exist', {
        fetch: fakeFetch,
      })
    ).rejects.toThrow(/404 Not Found/);
  });

  it('rejects payloads missing required arrays', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ name: 'bad', frames: 0 }),
    }));
    await expect(
      window.ACS_fetchGearSonicReferenceMotion('bad', { fetch: fakeFetch })
    ).rejects.toThrow(/joint_pos/);
  });

  it('retargets G1 joint positions onto VRM humanoid bones', () => {
    const motion = {
      jointPos: SAMPLE_MOTION.joint_pos,
      rootPos: SAMPLE_MOTION.root_pos,
      rootQuat: SAMPLE_MOTION.root_quat,
      frames: SAMPLE_MOTION.frames,
      fps: SAMPLE_MOTION.fps,
    };
    const delta = window.ACS_gearSonicReferenceDelta(motion, 0);
    expect(delta.active).toBe(true);
    // Expected bones present per the bone map (legs, spine, arms).
    expect(delta.rot.leftUpperLeg).toBeDefined();
    expect(delta.rot.rightUpperLeg).toBeDefined();
    expect(delta.rot.spine).toBeDefined();
    expect(delta.rot.leftUpperArm).toBeDefined();
    expect(delta.rot.rightUpperArm).toBeDefined();
    // Root translation derived from rootPos delta from frame 0; at t=0
    // delta from frame 0 is zero by definition.
    expect(Math.abs(delta.root.x)).toBeLessThan(1e-6);
  });

  it('loops frames so playback continues past the clip duration', () => {
    const motion = {
      jointPos: SAMPLE_MOTION.joint_pos,
      rootPos: SAMPLE_MOTION.root_pos,
      rootQuat: SAMPLE_MOTION.root_quat,
      frames: SAMPLE_MOTION.frames,
      fps: SAMPLE_MOTION.fps,
    };
    // Duration = 4/50 = 0.08s. Sample well past that — should still be
    // active and within the same retargeted range.
    const a = window.ACS_gearSonicReferenceDelta(motion, 0.04);
    const b = window.ACS_gearSonicReferenceDelta(motion, 0.04 + 0.08);
    expect(a.active).toBe(true);
    expect(b.active).toBe(true);
    expect(b.rot.leftUpperLeg.x).toBeCloseTo(a.rot.leftUpperLeg.x, 6);
  });

  it('returns inactive delta for a missing motion', () => {
    expect(window.ACS_gearSonicReferenceDelta(null, 0).active).toBe(false);
    expect(window.ACS_gearSonicReferenceDelta({ jointPos: [] }, 0).active).toBe(
      false
    );
  });
});

describe('GEAR-SONIC text-to-motion backend client', () => {
  it('reports no-backend when the URL is empty', async () => {
    const result = await window.ACS_generateGearSonicMotion('walk', {
      backendURL: '',
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('no-backend');
    expect(result.reason).toMatch(/backend/i);
  });

  it('reports empty-prompt when given an empty string', async () => {
    const result = await window.ACS_generateGearSonicMotion('', {
      backendURL: 'http://x',
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('empty-prompt');
  });

  it('POSTs to /api/generate and returns the motion on success', async () => {
    const fakeFetch = vi.fn(async (url, init) => {
      expect(url).toBe('http://example.test/api/generate');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.prompt).toBe('walk forward');
      expect(body.duration).toBe(5);
      expect(body.diffusion_steps).toBe(100);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          name: 'gen_walk',
          display: 'walk forward',
          fps: 50,
          frames: 4,
          joint_pos: SAMPLE_MOTION.joint_pos,
          root_pos: SAMPLE_MOTION.root_pos,
          root_quat: SAMPLE_MOTION.root_quat,
        }),
      };
    });
    const result = await window.ACS_generateGearSonicMotion('walk forward', {
      backendURL: 'http://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(true);
    expect(result.motion.frames).toBe(4);
    expect(result.motion.id).toBe('gen_walk');
  });

  it('reports backend HTTP errors verbatim', async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ detail: 'Model crashed' }),
    }));
    const result = await window.ACS_generateGearSonicMotion('walk', {
      backendURL: 'http://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('backend-error');
    expect(result.reason).toContain('500');
    expect(result.reason).toContain('Model crashed');
  });

  it('reports network errors verbatim', async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error('boom');
    });
    const result = await window.ACS_generateGearSonicMotion('walk', {
      backendURL: 'http://example.test',
      fetch: fakeFetch,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('network-error');
    expect(result.reason).toContain('boom');
  });
});

describe('GEAR-SONIC robot model info', () => {
  it('exposes the GEAR-SONIC scene XML and mesh base URLs', () => {
    const info = window.ACS_gearSonicRobotModelInfo();
    expect(info.sceneURL).toBe(
      'https://nvlabs.github.io/GEAR-SONIC/assets/robot/scene.xml'
    );
    expect(info.meshBaseURL).toBe(
      'https://nvlabs.github.io/GEAR-SONIC/assets/robot/meshes/'
    );
    expect(info.label).toMatch(/G1/);
  });

  it('honours a custom base URL', () => {
    const info = window.ACS_gearSonicRobotModelInfo({
      baseUrl: 'https://example.test/sonic',
    });
    expect(info.sceneURL).toBe(
      'https://example.test/sonic/assets/robot/scene.xml'
    );
    expect(info.meshBaseURL).toBe(
      'https://example.test/sonic/assets/robot/meshes/'
    );
  });
});
