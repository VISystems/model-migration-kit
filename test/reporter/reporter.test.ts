import { describe, it, expect } from 'vitest';
import { formatReport } from '../../src/reporter/reporter.js';
import type { MigrationReport } from '../../src/comparator/types.js';

const report: MigrationReport = {
  specName: 'Test Suite', oldModel: 'claude-sonnet-4-5', newModel: 'claude-sonnet-4-6',
  oldProvider: 'anthropic', newProvider: 'anthropic',
  timestamp: '2026-05-01T00:00:00Z',
  summary: { totalCases: 2, regressions: 1, improvements: 0, unchanged: 1, passRateDelta: -50, latencyDeltaPercent: 10, costDeltaPercent: 5 },
  thresholds: { passed: false, violations: [{ metric: 'pass-to-fail regressions', threshold: '<=0', actual: '1', severity: 'critical' }] },
  caseDeltas: [
    { caseId: 'c1', behaviorChange: 'pass-to-fail', oldOutput: 'a', newOutput: 'b', oldPass: true, newPass: false, latencyDeltaMs: 50, latencyDeltaPercent: 50, tokensDelta: { input: 5, output: 3 } },
    { caseId: 'c2', behaviorChange: 'unchanged-pass', oldOutput: 'x', newOutput: 'x', oldPass: true, newPass: true, latencyDeltaMs: -10, latencyDeltaPercent: -10, tokensDelta: { input: 0, output: 0 } },
  ],
};

describe('formatReport', () => {
  it('table format includes provider/model names', () => {
    const output = formatReport(report, 'table');
    expect(output).toContain('anthropic/claude-sonnet-4-5');
    expect(output).toContain('anthropic/claude-sonnet-4-6');
  });

  it('json format is valid JSON', () => {
    const output = formatReport(report, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.oldProvider).toBe('anthropic');
    expect(parsed.newProvider).toBe('anthropic');
  });

  it('markdown format includes provider/model', () => {
    const output = formatReport(report, 'markdown');
    expect(output).toContain('# Migration Report');
    expect(output).toContain('anthropic/claude-sonnet-4-5');
    expect(output).toContain('anthropic/claude-sonnet-4-6');
  });

  it('table shows threshold violations', () => {
    const output = formatReport(report, 'table');
    expect(output).toContain('pass-to-fail regressions');
  });

  it('cross-provider report shows different providers', () => {
    const crossReport: MigrationReport = {
      ...report,
      oldProvider: 'anthropic', newProvider: 'openai',
      oldModel: 'claude-sonnet-4-5', newModel: 'gpt-4o',
    };
    const output = formatReport(crossReport, 'table');
    expect(output).toContain('anthropic/claude-sonnet-4-5');
    expect(output).toContain('openai/gpt-4o');
  });
});
