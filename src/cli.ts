import { defineCommand, runMain } from 'citty';
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { runAgainstModel } from './runner/runner.js';
import { compareRuns } from './comparator/comparator.js';
import { formatReport } from './reporter/reporter.js';
import type { EvalSpec } from './runner/runner.js';
import type { MigrationThresholds } from './comparator/types.js';
import { DEFAULT_THRESHOLDS } from './comparator/types.js';

const compare = defineCommand({
  meta: { description: 'Compare eval results between two Claude model versions' },
  args: {
    specFile: { type: 'positional', description: 'Path to eval spec (.yaml)', required: true },
    oldModel: { type: 'string', description: 'Old model ID', required: true },
    newModel: { type: 'string', description: 'New model ID', required: true },
    format: { type: 'string', description: 'Output format: table, json, markdown', default: 'table' },
    maxLatency: { type: 'string', description: 'Max latency increase % threshold', default: '15' },
    maxCost: { type: 'string', description: 'Max cost increase % threshold', default: '20' },
  },
  async run({ args }) {
    if (!process.env.ANTHROPIC_API_KEY) {
      process.stderr.write('Error: ANTHROPIC_API_KEY environment variable is required\n');
      process.exit(2);
    }

    const raw = await readFile(args.specFile, 'utf-8');
    const spec = parseYaml(raw) as EvalSpec;

    process.stderr.write(`Running eval against ${args.oldModel}...\n`);
    const oldResult = await runAgainstModel(spec, args.oldModel, process.env.ANTHROPIC_API_KEY);

    process.stderr.write(`Running eval against ${args.newModel}...\n`);
    const newResult = await runAgainstModel(spec, args.newModel, process.env.ANTHROPIC_API_KEY);

    const thresholds: MigrationThresholds = {
      ...DEFAULT_THRESHOLDS,
      maxLatencyIncreasePercent: parseFloat(args.maxLatency),
      maxCostIncreasePercent: parseFloat(args.maxCost),
    };

    const report = compareRuns(oldResult, newResult, thresholds);
    process.stdout.write(formatReport(report, args.format as 'table' | 'json' | 'markdown') + '\n');
    process.exit(report.thresholds.passed ? 0 : 1);
  },
});

const offline = defineCommand({
  meta: { description: 'Compare two saved run result JSON files (offline mode)' },
  args: {
    oldFile: { type: 'positional', description: 'Path to old run result JSON', required: true },
    newFile: { type: 'positional', description: 'Path to new run result JSON', required: true },
    format: { type: 'string', description: 'Output format: table, json, markdown', default: 'table' },
  },
  async run({ args }) {
    const oldRun = JSON.parse(await readFile(args.oldFile, 'utf-8'));
    const newRun = JSON.parse(await readFile(args.newFile, 'utf-8'));
    const report = compareRuns(oldRun, newRun);
    process.stdout.write(formatReport(report, args.format as 'table' | 'json' | 'markdown') + '\n');
    process.exit(report.thresholds.passed ? 0 : 1);
  },
});

const main = defineCommand({
  meta: { name: 'model-migration-kit', version: '0.1.0', description: 'Automate Claude model version migrations with eval-based regression analysis' },
  subCommands: { compare, offline },
});

runMain(main);
