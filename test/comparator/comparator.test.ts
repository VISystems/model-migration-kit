import { describe, it, expect } from 'vitest';
import { compareRuns } from '../../src/comparator/comparator.js';
import type { ModelRunResult } from '../../src/runner/types.js';

function makeRun(model: string, cases: Array<{ id: string; pass: boolean; output: string; durationMs: number; tokens: { input: number; output: number } }>): ModelRunResult {
  return {
    model, specName: 'Test Suite',
    cases: cases.map((c) => ({ caseId: c.id, input: 'q', output: c.output, pass: c.pass, reason: c.pass ? 'OK' : 'FAIL', durationMs: c.durationMs, tokens: c.tokens })),
    totalPassed: cases.filter((c) => c.pass).length,
    totalFailed: cases.filter((c) => !c.pass).length,
    totalErrored: 0, totalCases: cases.length,
    durationMs: cases.reduce((s, c) => s + c.durationMs, 0),
    totalTokens: cases.reduce((t, c) => ({ input: t.input + c.tokens.input, output: t.output + c.tokens.output }), { input: 0, output: 0 }),
  };
}

describe('compareRuns', () => {
  it('detects no regressions when identical', () => {
    const cases = [{ id: 'c1', pass: true, output: 'hello', durationMs: 100, tokens: { input: 10, output: 5 } }];
    const report = compareRuns(makeRun('old', cases), makeRun('new', cases));
    expect(report.summary.regressions).toBe(0);
    expect(report.thresholds.passed).toBe(true);
  });

  it('detects pass-to-fail regression', () => {
    const old = makeRun('old', [{ id: 'c1', pass: true, output: 'a', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: false, output: 'b', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const report = compareRuns(old, nw);
    expect(report.summary.regressions).toBe(1);
    expect(report.thresholds.passed).toBe(false);
    expect(report.caseDeltas[0]!.behaviorChange).toBe('pass-to-fail');
  });

  it('detects fail-to-pass improvement', () => {
    const old = makeRun('old', [{ id: 'c1', pass: false, output: 'a', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: true, output: 'b', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const report = compareRuns(old, nw);
    expect(report.summary.improvements).toBe(1);
    expect(report.thresholds.passed).toBe(true);
  });

  it('detects output change without pass/fail change', () => {
    const old = makeRun('old', [{ id: 'c1', pass: true, output: 'old answer', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: true, output: 'new answer', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const report = compareRuns(old, nw);
    expect(report.caseDeltas[0]!.behaviorChange).toBe('output-changed');
  });

  it('computes latency delta', () => {
    const old = makeRun('old', [{ id: 'c1', pass: true, output: 'a', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: true, output: 'a', durationMs: 200, tokens: { input: 10, output: 5 } }]);
    const report = compareRuns(old, nw);
    expect(report.caseDeltas[0]!.latencyDeltaPercent).toBe(100);
  });

  it('flags latency threshold violation', () => {
    const old = makeRun('old', [{ id: 'c1', pass: true, output: 'a', durationMs: 100, tokens: { input: 10, output: 5 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: true, output: 'a', durationMs: 200, tokens: { input: 10, output: 5 } }]);
    const report = compareRuns(old, nw, { maxPassToFail: 0, maxLatencyIncreasePercent: 15, maxCostIncreasePercent: 20 });
    expect(report.thresholds.violations.some((v) => v.metric === 'latency increase')).toBe(true);
  });

  it('computes token/cost delta', () => {
    const old = makeRun('old', [{ id: 'c1', pass: true, output: 'a', durationMs: 100, tokens: { input: 100, output: 50 } }]);
    const nw = makeRun('new', [{ id: 'c1', pass: true, output: 'a', durationMs: 100, tokens: { input: 150, output: 75 } }]);
    const report = compareRuns(old, nw);
    expect(report.summary.costDeltaPercent).toBeGreaterThan(0);
  });
});
