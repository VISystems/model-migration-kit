# @visystems/model-migration-kit

Automate Claude model version migrations with eval-based regression analysis. Run your eval suite against old and new model versions, get a detailed regression report with threshold-based pass/fail.

## Installation

```bash
npm install -g @visystems/model-migration-kit
```

## Quick Start

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Compare two model versions against an eval spec
model-migration-kit compare migration.eval.yaml \
  --old-model claude-sonnet-4-5 \
  --new-model claude-sonnet-4-6

# Compare saved results offline
model-migration-kit offline old-results.json new-results.json --format markdown
```

## Thresholds

The migration kit flags issues based on configurable thresholds:

| Metric | Default Threshold | Severity |
|--------|------------------|----------|
| Pass-to-fail regressions | 0 (any regression fails) | Critical |
| Latency increase | >15% | Warning |
| Cost increase | >20% | Warning |

## Output Formats

- **table** (default) — Terminal output with ANSI colors
- **json** — Machine-readable JSON
- **markdown** — PR/report-ready markdown with tables

## Exit Codes

- `0` — All thresholds passed
- `1` — One or more threshold violations
- `2` — Configuration error

## License

Apache 2.0
