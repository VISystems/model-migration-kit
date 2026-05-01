import { describe, it, expect } from 'vitest';
// Runner requires API key — tested via integration only
describe('runner', () => {
  it('module exports are valid', async () => {
    const mod = await import('../../src/runner/runner.js');
    expect(typeof mod.runAgainstModel).toBe('function');
  });
});
