export interface EvalCaseResult {
  caseId: string;
  caseName?: string;
  input: string;
  output: string;
  pass: boolean;
  reason: string;
  durationMs: number;
  tokens: { input: number; output: number };
  error?: string;
}

export interface ModelRunResult {
  model: string;
  provider: string;
  specName: string;
  cases: EvalCaseResult[];
  totalPassed: number;
  totalFailed: number;
  totalErrored: number;
  totalCases: number;
  durationMs: number;
  totalTokens: { input: number; output: number };
}
