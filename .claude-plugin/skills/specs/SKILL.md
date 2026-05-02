---
name: specs
description: Generate specs from stories, inspect story context, and refresh individual Azure DevOps test cases into local files. Use when the user wants story-to-spec generation or targeted test-case sync.
argument-hint: [generate|story-context|fetch-test-case] [ids and options]
---

# ado-sync spec workflows

Use the bundled [runner script](../../scripts/run-ado-sync.mjs) and [command reference](../../resources/cli-reference.md).

## Process

1. Choose the matching workflow:
   - `generate --story-ids <ids> --format <gherkin|markdown>`
   - `story-context --story-id <id>`
   - `fetch-test-case <test-case-id>`
2. Run the command with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ...`
3. For `generate`, ask for the output format only if the user did not already specify `gherkin` or `markdown`.
4. For `fetch-test-case`, use the plugin alias rather than rebuilding the `pull --tags` expression yourself.
5. Summarize which stories or test cases were targeted and whether local specs were created or refreshed.

## Examples

- Generate markdown specs for two stories:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" generate --story-ids 1234,5678 --format markdown`
- Show context for story 1234:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" story-context --story-id 1234`
- Refresh test case 9876 into the linked spec:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" fetch-test-case 9876`
