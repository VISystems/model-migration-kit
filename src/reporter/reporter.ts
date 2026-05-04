import type { MigrationReport } from '../comparator/types.js';

const isTTY = process.stdout.isTTY ?? false;
const bold = (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const green = (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);

export function formatReport(report: MigrationReport, format: 'table' | 'json' | 'markdown' = 'table'): string {
  switch (format) {
    case 'json': return JSON.stringify(report, null, 2);
    case 'markdown': return formatMarkdown(report);
    default: return formatTable(report);
  }
}

function formatTable(r: MigrationReport): string {
  const lines: string[] = [];
  const icon = r.thresholds.passed ? green('PASS') : red('FAIL');

  lines.push(bold(`Migration Report: ${r.specName}`));
  lines.push(`Old: ${r.oldProvider}/${r.oldModel}  →  New: ${r.newProvider}/${r.newModel}  ${icon}`);
  lines.push(dim('─'.repeat(70)));

  lines.push(bold('Summary'));
  lines.push(`  Cases: ${r.summary.totalCases}`);
  lines.push(`  Regressions: ${r.summary.regressions > 0 ? red(String(r.summary.regressions)) : green('0')}`);
  lines.push(`  Improvements: ${r.summary.improvements > 0 ? green(String(r.summary.improvements)) : '0'}`);
  lines.push(`  Pass rate delta: ${fmtDelta(r.summary.passRateDelta)}pp`);
  lines.push(`  Latency delta: ${fmtDelta(r.summary.latencyDeltaPercent)}%`);
  lines.push(`  Cost delta: ${fmtDelta(r.summary.costDeltaPercent)}%`);

  if (r.thresholds.violations.length > 0) {
    lines.push('');
    lines.push(bold('Threshold Violations'));
    for (const v of r.thresholds.violations) {
      const sev = v.severity === 'critical' ? red(`[${v.severity.toUpperCase()}]`) : yellow(`[${v.severity.toUpperCase()}]`);
      lines.push(`  ${sev} ${v.metric}: ${v.actual} (threshold: ${v.threshold})`);
    }
  }

  lines.push('');
  lines.push(bold('Case Details'));
  for (const d of r.caseDeltas) {
    const label = d.caseName ?? d.caseId;
    let status: string;
    switch (d.behaviorChange) {
      case 'pass-to-fail': status = red('REGRESSION'); break;
      case 'fail-to-pass': status = green('FIXED'); break;
      case 'output-changed': status = yellow('CHANGED'); break;
      default: status = dim(d.newPass ? 'pass' : 'fail');
    }
    lines.push(`  ${label}: ${status}  latency: ${fmtDelta(d.latencyDeltaPercent)}%`);
  }

  return lines.join('\n');
}

function formatMarkdown(r: MigrationReport): string {
  const icon = r.thresholds.passed ? '✅' : '❌';
  const lines: string[] = [];

  lines.push(`# Migration Report: ${r.specName} ${icon}`);
  lines.push(`**${r.oldProvider}/${r.oldModel}** → **${r.newProvider}/${r.newModel}**`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Cases | ${r.summary.totalCases} |`);
  lines.push(`| Regressions | ${r.summary.regressions} |`);
  lines.push(`| Improvements | ${r.summary.improvements} |`);
  lines.push(`| Pass rate delta | ${r.summary.passRateDelta > 0 ? '+' : ''}${r.summary.passRateDelta.toFixed(1)}pp |`);
  lines.push(`| Latency delta | ${r.summary.latencyDeltaPercent > 0 ? '+' : ''}${r.summary.latencyDeltaPercent.toFixed(1)}% |`);
  lines.push(`| Cost delta | ${r.summary.costDeltaPercent > 0 ? '+' : ''}${r.summary.costDeltaPercent.toFixed(1)}% |`);

  if (r.thresholds.violations.length > 0) {
    lines.push('');
    lines.push('## Threshold Violations');
    for (const v of r.thresholds.violations) {
      lines.push(`- **${v.severity.toUpperCase()}:** ${v.metric}: ${v.actual} (threshold: ${v.threshold})`);
    }
  }

  lines.push('');
  lines.push('## Case Details');
  lines.push('| Case | Status | Latency Δ |');
  lines.push('|------|--------|-----------|');
  for (const d of r.caseDeltas) {
    const label = d.caseName ?? d.caseId;
    const status = { 'pass-to-fail': '❌ Regression', 'fail-to-pass': '✅ Fixed', 'output-changed': '⚠️ Changed', 'unchanged-pass': '✓ Pass', 'unchanged-fail': '✗ Fail' }[d.behaviorChange];
    lines.push(`| ${label} | ${status} | ${d.latencyDeltaPercent > 0 ? '+' : ''}${d.latencyDeltaPercent.toFixed(1)}% |`);
  }

  return lines.join('\n');
}

function fmtDelta(n: number): string {
  const s = n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
  if (!isTTY) return s;
  if (n > 0) return red(s);
  if (n < 0) return green(s);
  return s;
}
