---
name: sync
description: Run ado-sync setup, validation, diff, push, pull, and config-inspection workflows. Use when the user wants to initialize ado-sync, validate connectivity, compare local specs with Azure DevOps, or sync changes in either direction.
argument-hint: [init|validate|status|diff|push|pull|config show] [options]
---

# ado-sync sync workflows

Use the bundled [runner script](../../scripts/run-ado-sync.mjs) and [command reference](../../resources/cli-reference.md) for all commands.

## Process

1. Translate the request to one of these workflows:
   - `init <ado-sync.json|ado-sync.yml> --no-interactive`
   - `validate`
   - `status`
   - `diff`
   - `push [--dry-run]`
   - `pull [--dry-run]`
   - `config show`
2. Run the command with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ...`
3. If the user asks for a preview, audit, or safety check, use `--dry-run` for `push` or `pull`.
4. If the user clearly asks to sync, run the live command instead of defaulting to a dry run.
5. If config discovery fails, switch to `init`, help the user pick JSON or YAML, and then run `validate`.

## Examples

- Preview a push:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" push --dry-run`
- Pull the latest remote changes:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" pull`
- Show the resolved config:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" config show`
