import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar3D } from '../src/components/Avatar3D.jsx';

// Mock Three.js and React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas-mock">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {
      position: { distanceTo: vi.fn().mockReturnValue(3) },
    },
  }),
}));

vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({
    scene: { clone: vi.fn().mockReturnValue({ traverse: vi.fn() }) },
    animations: [],
  })),
  OrbitControls: () => null,
  Environment: () => null,
  useAnimations: vi.fn(() => ({ actions: {}, mixer: null })),
  Html: ({ children }) => <div>{children}</div>,
  PerspectiveCamera: () => null,
}));

vi.mock('three', () => ({
  MeshStandardMaterial: vi.fn(),
  Color: vi.fn().mockImplementation(() => ({
    offsetHSL: vi.fn().mockReturnThis(),
  })),
  MathUtils: {
    lerp: (a, b, t) => a + (b - a) * t,
  },
  DoubleSide: 2,
}));

describe('Avatar3D Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the avatar3d container', () => {
    const { container } = render(<Avatar3D />);
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders the Canvas component', () => {
    render(<Avatar3D />);
    expect(screen.getByTestId('canvas-mock')).not.toBeNull();
  });

  it('renders with default configuration', () => {
    const { container } = render(<Avatar3D />);
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders with custom skin color config', () => {
    const { container } = render(
      <Avatar3D config={{ skinColor: '#ffffff' }} />
    );
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders with custom hair color config', () => {
    const { container } = render(
      <Avatar3D config={{ hairColor: '#000000' }} />
    );
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders with custom eye color config', () => {
    const { container } = render(<Avatar3D config={{ eyeColor: '#00ff00' }} />);
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders with custom clothes color config', () => {
    const { container } = render(
      <Avatar3D config={{ clothesColor: '#ff0000' }} />
    );
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('accepts isTalking prop', () => {
    const { container } = render(<Avatar3D isTalking={true} />);
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('accepts currentAnimation prop', () => {
    const { container } = render(<Avatar3D currentAnimation="happy" />);
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('accepts modelUrl prop', () => {
    const { container } = render(
      <Avatar3D modelUrl="https://example.com/model.glb" />
    );
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('renders with 3D-specific config options', () => {
    const { container } = render(
      <Avatar3D
        config={{
          enableLOD: true,
          enableShadows: true,
          modelScale: 1.5,
        }}
      />
    );
    expect(container.querySelector('.avatar3d-container')).not.toBeNull();
  });

  it('exports ANIMATIONS constant', () => {
    expect(Avatar3D.ANIMATIONS).toBeDefined();
    expect(Array.isArray(Avatar3D.ANIMATIONS)).toBe(true);
    expect(Avatar3D.ANIMATIONS).toContain('idle');
    expect(Avatar3D.ANIMATIONS).toContain('happy');
    expect(Avatar3D.ANIMATIONS).toContain('wave');
  });

  it('exports DEFAULT_CONFIG constant', () => {
    expect(Avatar3D.DEFAULT_CONFIG).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.skinColor).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.hairColor).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.eyeColor).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.clothesColor).toBeDefined();
    // 3D specific defaults
    expect(Avatar3D.DEFAULT_CONFIG.enableLOD).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.enableShadows).toBeDefined();
    expect(Avatar3D.DEFAULT_CONFIG.modelScale).toBeDefined();
  });

  it('DEFAULT_CONFIG has enableLOD set to true by default', () => {
    expect(Avatar3D.DEFAULT_CONFIG.enableLOD).toBe(true);
  });

  it('DEFAULT_CONFIG has enableShadows set to true by default', () => {
    expect(Avatar3D.DEFAULT_CONFIG.enableShadows).toBe(true);
  });

  it('DEFAULT_CONFIG has modelScale set to 1 by default', () => {
    expect(Avatar3D.DEFAULT_CONFIG.modelScale).toBe(1);
  });
});
