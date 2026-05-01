export interface CaseDelta {
  caseId: string;
  caseName?: string;
  behaviorChange: 'pass-to-fail' | 'fail-to-pass' | 'unchanged-pass' | 'unchanged-fail' | 'output-changed';
  oldOutput: string;
  newOutput: string;
  oldPass: boolean;
  newPass: boolean;
  latencyDeltaMs: number;
  latencyDeltaPercent: number;
  tokensDelta: { input: number; output: number };
}

export interface MigrationReport {
  specName: string;
  oldModel: string;
  newModel: string;
  timestamp: string;
  summary: {
    totalCases: number;
    regressions: number;
    improvements: number;
    unchanged: number;
    passRateDelta: number;
    latencyDeltaPercent: number;
    costDeltaPercent: number;
  };
  thresholds: ThresholdResult;
  caseDeltas: CaseDelta[];
}

export interface ThresholdResult {
  passed: boolean;
  violations: ThresholdViolation[];
}

export interface ThresholdViolation {
  metric: string;
  threshold: string;
  actual: string;
  severity: 'critical' | 'warning';
}

export interface MigrationThresholds {
  maxPassToFail: number;
  maxLatencyIncreasePercent: number;
  maxCostIncreasePercent: number;
}

export const DEFAULT_THRESHOLDS: MigrationThresholds = {
  maxPassToFail: 0,
  maxLatencyIncreasePercent: 15,
  maxCostIncreasePercent: 20,
};
