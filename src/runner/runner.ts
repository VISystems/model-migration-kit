import { createClient } from '@visystems/eval-runner/client';
import type { ModelRunResult, EvalCaseResult } from './types.js';

export interface EvalSpec {
  name: string;
  model: { maxTokens: number; systemPrompt?: string; temperature?: number };
  defaultGrading: { mode: string };
  cases: Array<{ id: string; name?: string; input: string; expected?: string }>;
}

export async function runAgainstModel(
  spec: EvalSpec,
  provider: string,
  model: string,
): Promise<ModelRunResult> {
  const client = createClient(provider);
  const cases: EvalCaseResult[] = [];
  const startTime = Date.now();

  for (const c of spec.cases) {
    const caseStart = Date.now();
    try {
      const response = await client.chat({
        model,
        maxTokens: spec.model.maxTokens,
        ...(spec.model.systemPrompt ? { systemPrompt: spec.model.systemPrompt } : {}),
        ...(spec.model.temperature !== undefined ? { temperature: spec.model.temperature } : {}),
        messages: [{ role: 'user', content: c.input }],
      });

      const text = response.content;

      let pass = true;
      let reason = 'Output captured';
      if (c.expected !== undefined) {
        pass = text.trim() === c.expected.trim();
        reason = pass ? 'Exact match' : `Expected "${c.expected}", got "${text}"`;
      }

      cases.push({
        caseId: c.id, caseName: c.name, input: c.input, output: text,
        pass, reason, durationMs: Date.now() - caseStart,
        tokens: { input: response.tokens.input, output: response.tokens.output },
      });
    } catch (err) {
      cases.push({
        caseId: c.id, caseName: c.name, input: c.input, output: '',
        pass: false, reason: `Error: ${(err as Error).message}`,
        durationMs: Date.now() - caseStart, tokens: { input: 0, output: 0 },
        error: (err as Error).message,
      });
    }
  }

  const passed = cases.filter((c) => c.pass && !c.error).length;
  const errored = cases.filter((c) => c.error).length;

  return {
    model, provider, specName: spec.name, cases,
    totalPassed: passed, totalFailed: cases.length - passed - errored,
    totalErrored: errored, totalCases: cases.length,
    durationMs: Date.now() - startTime,
    totalTokens: cases.reduce((t, c) => ({ input: t.input + c.tokens.input, output: t.output + c.tokens.output }), { input: 0, output: 0 }),
  };
}
