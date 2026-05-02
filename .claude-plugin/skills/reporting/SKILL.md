---
name: reporting
description: Run ado-sync reporting, coverage, stale-link, AC-gate, trend, tag-audit, and test-result publishing workflows. Use when the user wants quality signals or Azure DevOps test result publication.
argument-hint: [coverage|stale|ac-gate|trend|find-tagged|publish-test-results] [options]
---

# ado-sync reporting workflows

Use the bundled [runner script](../../scripts/run-ado-sync.mjs) and [command reference](../../resources/cli-reference.md).

## Process

1. Map the request to one of these commands:
   - `coverage`
   - `stale`
   - `ac-gate [--story-ids <ids> | --area-path <path> | --query <wiql>] [--fail-on-no-ac]`
   - `trend --days <n> --max-runs <n>`
   - `find-tagged --tag <tag> --hours <n> | --days <n> [--work-item-type <type>]`
   - `publish-test-results --testResult <path>... --testResultFormat <playwrightJson|cucumberJson|trx|junit|nunitXml|ctrfJson> [--runName <name>] [--dry-run]`
2. Run it with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ...`
3. For AC gate, ask which scope to use only when the user has not already specified story IDs, area path, or WIQL.
4. For result publishing, ask for missing file paths and result format before running the command.
5. If the user wants a rehearsal of result publishing, add `--dry-run`.
6. Summarize the report or publication outcome, including the scope and notable failures or follow-up actions.

## Examples

- Coverage report:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" coverage`
- AC gate over specific stories:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ac-gate --story-ids 1234,5678 --fail-on-no-ac`
- Publish Playwright JSON results:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" publish-test-results --testResult playwright-report.json --testResultFormat playwrightJson --runName "CI smoke"`
