import type { ModelRunResult } from '../runner/types.js';
import type { MigrationReport, CaseDelta, ThresholdResult, ThresholdViolation, MigrationThresholds } from './types.js';
import { DEFAULT_THRESHOLDS } from './types.js';

export function compareRuns(
  oldRun: ModelRunResult,
  newRun: ModelRunResult,
  thresholds: MigrationThresholds = DEFAULT_THRESHOLDS,
): MigrationReport {
  const caseDeltas: CaseDelta[] = [];
  let regressions = 0;
  let improvements = 0;
  let unchanged = 0;

  for (let i = 0; i < oldRun.cases.length; i++) {
    const oldCase = oldRun.cases[i]!;
    const newCase = newRun.cases.find((c) => c.caseId === oldCase.caseId);
    if (!newCase) continue;

    let behaviorChange: CaseDelta['behaviorChange'];
    if (oldCase.pass && !newCase.pass) { behaviorChange = 'pass-to-fail'; regressions++; }
    else if (!oldCase.pass && newCase.pass) { behaviorChange = 'fail-to-pass'; improvements++; }
    else if (oldCase.pass && newCase.pass && oldCase.output !== newCase.output) { behaviorChange = 'output-changed'; unchanged++; }
    else if (oldCase.pass && newCase.pass) { behaviorChange = 'unchanged-pass'; unchanged++; }
    else { behaviorChange = 'unchanged-fail'; unchanged++; }

    const latencyDelta = newCase.durationMs - oldCase.durationMs;
    const latencyPct = oldCase.durationMs > 0 ? (latencyDelta / oldCase.durationMs) * 100 : 0;

    caseDeltas.push({
      caseId: oldCase.caseId, caseName: oldCase.caseName, behaviorChange,
      oldOutput: oldCase.output, newOutput: newCase.output,
      oldPass: oldCase.pass, newPass: newCase.pass,
      latencyDeltaMs: latencyDelta, latencyDeltaPercent: latencyPct,
      tokensDelta: {
        input: newCase.tokens.input - oldCase.tokens.input,
        output: newCase.tokens.output - oldCase.tokens.output,
      },
    });
  }

  const oldPassRate = oldRun.totalCases > 0 ? oldRun.totalPassed / oldRun.totalCases : 0;
  const newPassRate = newRun.totalCases > 0 ? newRun.totalPassed / newRun.totalCases : 0;
  const passRateDelta = (newPassRate - oldPassRate) * 100;

  const avgLatencyOld = oldRun.totalCases > 0 ? oldRun.durationMs / oldRun.totalCases : 0;
  const avgLatencyNew = newRun.totalCases > 0 ? newRun.durationMs / newRun.totalCases : 0;
  const latencyDeltaPct = avgLatencyOld > 0 ? ((avgLatencyNew - avgLatencyOld) / avgLatencyOld) * 100 : 0;

  const oldTotalTokens = oldRun.totalTokens.input + oldRun.totalTokens.output;
  const newTotalTokens = newRun.totalTokens.input + newRun.totalTokens.output;
  const costDeltaPct = oldTotalTokens > 0 ? ((newTotalTokens - oldTotalTokens) / oldTotalTokens) * 100 : 0;

  const thresholdResult = checkThresholds(regressions, latencyDeltaPct, costDeltaPct, thresholds);

  return {
    specName: oldRun.specName, oldModel: oldRun.model, newModel: newRun.model,
    oldProvider: oldRun.provider, newProvider: newRun.provider,
    timestamp: new Date().toISOString(),
    summary: {
      totalCases: caseDeltas.length, regressions, improvements, unchanged,
      passRateDelta, latencyDeltaPercent: latencyDeltaPct, costDeltaPercent: costDeltaPct,
    },
    thresholds: thresholdResult,
    caseDeltas,
  };
}

function checkThresholds(
  regressions: number, latencyPct: number, costPct: number, t: MigrationThresholds,
): ThresholdResult {
  const violations: ThresholdViolation[] = [];

  if (regressions > t.maxPassToFail) {
    violations.push({ metric: 'pass-to-fail regressions', threshold: `≤${t.maxPassToFail}`, actual: `${regressions}`, severity: 'critical' });
  }
  if (latencyPct > t.maxLatencyIncreasePercent) {
    violations.push({ metric: 'latency increase', threshold: `≤${t.maxLatencyIncreasePercent}%`, actual: `${latencyPct.toFixed(1)}%`, severity: 'warning' });
  }
  if (costPct > t.maxCostIncreasePercent) {
    violations.push({ metric: 'cost increase', threshold: `≤${t.maxCostIncreasePercent}%`, actual: `${costPct.toFixed(1)}%`, severity: 'warning' });
  }

  return { passed: violations.length === 0, violations };
}
