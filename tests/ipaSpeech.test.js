import { beforeAll, describe, expect, it } from 'vitest';

describe('experimental IPA speech adapter', () => {
  beforeAll(async () => {
    await import('../public/new/src/ipaSpeech.js');
  });

  it('converts dictionary-backed English text into IPA phonemes', () => {
    const plan = window.ACS_createIpaSpeechPlan('Hello avatar physics');

    expect(plan.ok).toBe(true);
    expect(plan.status).toBe('ready');
    expect(plan.ipa).toContain('h');
    expect(plan.ipa).toContain('f');
    expect(plan.words.map((word) => word.word)).toEqual([
      'hello',
      'avatar',
      'physics',
    ]);
    expect(plan.words.every((word) => word.source === 'dictionary')).toBe(true);
    expect(plan.phonemes.length).toBeGreaterThan(8);
  });

  it('maps IPA phonemes to visemes and VRM mouth expressions', () => {
    const plan = window.ACS_createIpaSpeechPlan('my mouth moves');

    expect(plan.ok).toBe(true);
    expect(plan.visemes.map((viseme) => viseme.viseme)).toContain('bilabial');
    expect(plan.visemes.map((viseme) => viseme.viseme)).toContain(
      'labiodental'
    );
    expect(plan.phonemes.some((phoneme) => phoneme.expression === 'aa')).toBe(
      true
    );
    expect(plan.phonemes.some((phoneme) => phoneme.expression === 'ou')).toBe(
      true
    );
  });

  it('generates jaw and expression deltas from the IPA timeline', () => {
    const plan = window.ACS_createIpaSpeechPlan('avatar');
    const delta = window.ACS_ipaSpeechDelta(plan, 0.18);

    expect(delta.active).toBe(true);
    expect(delta.rot.jaw.x).toBeGreaterThan(0.05);
    expect(
      Object.keys(delta.exprs).some((name) =>
        ['aa', 'ih', 'ou', 'ee', 'oh'].includes(name)
      )
    ).toBe(true);
  });

  it('inserts neutral silence between words instead of jumping phonemes', () => {
    const plan = window.ACS_createIpaSpeechPlan('my mouth');
    const silence = plan.phonemes.find((phoneme) => phoneme.ipa === 'sil');

    expect(silence).toBeDefined();

    const delta = window.ACS_ipaSpeechDelta(
      plan,
      silence.start + silence.duration / 2
    );

    expect(delta.active).toBe(true);
    expect(delta.viseme).toBe('silence');
    expect(delta.rot.jaw.x).toBeLessThan(0.03);
  });

  it('keeps unknown English words animatable with rule fallback coverage', () => {
    const plan = window.ACS_createIpaSpeechPlan('zorb quibble');

    expect(plan.ok).toBe(true);
    expect(plan.words.some((word) => word.source === 'rules')).toBe(true);
    expect(plan.coverage.dictionaryWords).toBeLessThan(
      plan.coverage.totalWords
    );
    expect(plan.reason).toContain('rule fallback');
  });
});
