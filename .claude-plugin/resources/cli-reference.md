# ado-sync plugin command reference

Use the bundled runner for all commands:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" <ado-sync arguments>
```

The runner:

- finds a workspace-local `node_modules/.bin/ado-sync` first and falls back to a global install
- finds `ado-sync.json`, `ado-sync.yml`, `ado-sync.yaml`, `azure-test-sync.json`, `azure-test-sync.yml`, or `azure-test-sync.yaml`
- auto-appends `--config <path>` for commands that require a config file

## Common workflows

| Intent | Command |
| --- | --- |
| Initialize config | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" init ado-sync.json --no-interactive` |
| Initialize YAML config | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" init ado-sync.yml --no-interactive` |
| Validate config | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" validate` |
| Check status | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" status` |
| Show field diff | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" diff` |
| Push specs | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" push` |
| Preview push | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" push --dry-run` |
| Pull from ADO | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" pull` |
| Preview pull | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" pull --dry-run` |
| Show resolved config | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" config show` |
| Generate gherkin specs | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" generate --story-ids 1234,5678 --format gherkin` |
| Generate markdown specs | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" generate --story-ids 1234,5678 --format markdown` |
| Show story context | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" story-context --story-id 1234` |
| Refresh one linked test case | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" fetch-test-case 1234` |
| Detect stale test cases | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" stale` |
| Show coverage | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" coverage` |
| Run AC gate for all active stories | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ac-gate` |
| Run AC gate for story IDs | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" ac-gate --story-ids 1234,5678 --fail-on-no-ac` |
| Trend report | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" trend --days 30 --max-runs 50` |
| Find tagged work items | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" find-tagged --tag regression --days 7 --work-item-type "User Story"` |
| Publish results | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" publish-test-results --testResult results.json --testResultFormat playwrightJson --runName "Smoke Tests"` |
| Start watch | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" watch` |

## Helper modes

| Intent | Command |
| --- | --- |
| Print resolved config path | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" --print-config-path` |
| Print tag prefix from config | `node "${CLAUDE_PLUGIN_ROOT}/scripts/run-ado-sync.mjs" --print-tag-prefix` |

`fetch-test-case` is a plugin alias. It resolves the configured `sync.tagPrefix` (default `tc`) and runs `pull --tags @<tagPrefix>:<id>`.
