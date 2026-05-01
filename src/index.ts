export { runAgainstModel } from './runner/runner.js';
export { compareRuns } from './comparator/comparator.js';
export { formatReport } from './reporter/reporter.js';
export type { EvalSpec } from './runner/runner.js';
export type { ModelRunResult, EvalCaseResult } from './runner/types.js';
export type { MigrationReport, CaseDelta, ThresholdResult, ThresholdViolation, MigrationThresholds } from './comparator/types.js';
export { DEFAULT_THRESHOLDS } from './comparator/types.js';
