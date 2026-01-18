import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Avatar } from '../src/components/Avatar.jsx';

describe('Avatar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the avatar container', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('.avatar-container')).not.toBeNull();
  });

  it('renders with default configuration', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('.avatar')).not.toBeNull();
    expect(container.querySelector('.avatar-head')).not.toBeNull();
    expect(container.querySelector('.avatar-eyes')).not.toBeNull();
  });

  it('applies custom skin color', () => {
    const { container } = render(<Avatar config={{ skinColor: '#ffffff' }} />);
    const avatarContainer = container.querySelector('.avatar-container');
    expect(avatarContainer.style.getPropertyValue('--skin-color')).toBe(
      '#ffffff'
    );
  });

  it('applies custom hair color', () => {
    const { container } = render(<Avatar config={{ hairColor: '#000000' }} />);
    const avatarContainer = container.querySelector('.avatar-container');
    expect(avatarContainer.style.getPropertyValue('--hair-color')).toBe(
      '#000000'
    );
  });

  it('applies custom eye color', () => {
    const { container } = render(<Avatar config={{ eyeColor: '#00ff00' }} />);
    const avatarContainer = container.querySelector('.avatar-container');
    expect(avatarContainer.style.getPropertyValue('--eye-color')).toBe(
      '#00ff00'
    );
  });

  it('applies custom clothes color', () => {
    const { container } = render(
      <Avatar config={{ clothesColor: '#ff0000' }} />
    );
    const avatarContainer = container.querySelector('.avatar-container');
    expect(avatarContainer.style.getPropertyValue('--clothes-color')).toBe(
      '#ff0000'
    );
  });

  it('renders talking mouth when isTalking is true', () => {
    const { container } = render(<Avatar isTalking={true} />);
    expect(container.querySelector('.avatar-mouth.talking')).not.toBeNull();
  });

  it('renders normal mouth when isTalking is false', () => {
    const { container } = render(<Avatar isTalking={false} />);
    expect(container.querySelector('.avatar-mouth.normal')).not.toBeNull();
  });

  it('applies animation class', () => {
    const { container } = render(<Avatar currentAnimation="happy" />);
    expect(container.querySelector('.avatar.happy')).not.toBeNull();
  });

  it('has all body parts', () => {
    const { container } = render(<Avatar />);
    const bodyParts = [
      '.avatar-head',
      '.avatar-hair-back',
      '.avatar-hair-front',
      '.avatar-eyes',
      '.avatar-mouth',
      '.avatar-nose',
      '.avatar-neck',
      '.avatar-body',
    ];

    bodyParts.forEach((part) => {
      expect(container.querySelector(part)).not.toBeNull();
    });
  });

  it('exports ANIMATIONS constant', () => {
    expect(Avatar.ANIMATIONS).toBeDefined();
    expect(Array.isArray(Avatar.ANIMATIONS)).toBe(true);
    expect(Avatar.ANIMATIONS).toContain('idle');
    expect(Avatar.ANIMATIONS).toContain('happy');
    expect(Avatar.ANIMATIONS).toContain('wave');
  });

  it('exports DEFAULT_CONFIG constant', () => {
    expect(Avatar.DEFAULT_CONFIG).toBeDefined();
    expect(Avatar.DEFAULT_CONFIG.skinColor).toBeDefined();
    expect(Avatar.DEFAULT_CONFIG.hairColor).toBeDefined();
    expect(Avatar.DEFAULT_CONFIG.eyeColor).toBeDefined();
    expect(Avatar.DEFAULT_CONFIG.clothesColor).toBeDefined();
  });
});
