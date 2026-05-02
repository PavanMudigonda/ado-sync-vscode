# ado-sync — VS Code Extension + Copilot Agent Plugin

Bidirectional sync between local test specs (`.feature`, `.md`) and Azure DevOps Test Cases, right from VS Code.

This repository now ships two integration surfaces that reuse the same `ado-sync` CLI:

- the traditional VS Code extension in this package
- a Copilot agent plugin under `.claude-plugin/` that can be installed from the repository source

---

## Requirements

- [ado-sync](https://www.npmjs.com/package/ado-sync) installed globally or locally in your project:
  ```bash
  npm install -g ado-sync
  # or per-project
  npm install --save-dev ado-sync
  ```
- An `ado-sync.json` config file in your workspace root ([setup guide](https://github.com/PavanMudigonda/ado-sync#configuration))

---

## Copilot agent plugin

The repository includes an **ADO Sync** custom agent and three plugin skills:

| Plugin customization | Purpose |
|---------|-------------|
| `ADO Sync` agent | Orchestrates ado-sync workflows from chat |
| `/ado-sync:sync` | Init, validate, status, diff, push, pull, and `config show` |
| `/ado-sync:specs` | Generate specs, show story context, and refresh one test case |
| `/ado-sync:reporting` | Coverage, stale checks, AC gate, trends, tag audits, and result publishing |

### Install from source

1. In VS Code, run **Chat: Install Plugin From Source**
2. Install from `PavanMudigonda/ado-sync-vscode` or a local clone of this repository
3. Open Chat and select the **ADO Sync** agent or invoke one of the `/ado-sync:*` skills

### Install from a plugin marketplace

This repository now also publishes a marketplace manifest at `.github/plugin/marketplace.json`.

For Copilot CLI, add the marketplace and install the plugin with:

```bash
copilot plugin marketplace add PavanMudigonda/ado-sync-vscode
copilot plugin install ado-sync@pavanmudigonda-plugins
```

For VS Code's **Agent Plugins** view, the plugin appears after this marketplace is configured for your environment. Once available, search for `ado-sync` in the **@agentPlugins** view and install it from there.

You can also install the same plugin in Copilot CLI:

```bash
copilot plugin install PavanMudigonda/ado-sync-vscode
```

The plugin uses the bundled runner in `.claude-plugin/scripts/run-ado-sync.mjs`, which auto-detects the workspace config file and prefers a workspace-local `ado-sync` binary when available.

---

## Features

### Copilot chat workflows

From chat, the plugin can drive these ado-sync flows:

- setup and config validation
- status, diff, push, and pull
- story-to-spec generation and story context lookup
- targeted single-test-case refresh
- stale-link and coverage reporting
- AC gate, trend analysis, and recent tag audits
- test result publishing to Azure DevOps

### VS Code extension commands

### Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

| Command | Description |
|---------|-------------|
| `ado-sync: Push` | Push local spec changes to Azure DevOps |
| `ado-sync: Push (Dry Run)` | Preview what would be pushed |
| `ado-sync: Pull` | Pull ADO changes into local spec files |
| `ado-sync: Pull (Dry Run)` | Preview what would be pulled |
| `ado-sync: Status` | Show diff between local and ADO |
| `ado-sync: Validate Config` | Check config validity and Azure connection |
| `ado-sync: Generate Spec from Story` | Generate `.feature` or `.md` from an ADO User Story ID |
| `ado-sync: Fetch Test Case` | Fetch a specific ADO Test Case by ID and display its details |
| `ado-sync: Publish Test Results` | Upload local test result files (Playwright, Cucumber, JUnit, TRX, NUnit, CTRF) to an ADO Test Run |
| `ado-sync: Detect Stale Test Cases` | List ADO Test Cases that have no corresponding local spec |
| `ado-sync: Show Coverage Report` | Show spec link rate and story coverage % |
| `ado-sync: Start Watch` | Auto-push local spec changes to ADO on file save |
| `ado-sync: Stop Watch` | Stop the running watch process |
| `ado-sync: AC Gate (validate stories)` | Validate that User Stories have AC and linked test cases (CI gate) |
| `ado-sync: Test Run Trend Report` | Detect flaky tests and failure patterns over the last N days |
| `ado-sync: Find Recently Tagged Work Items` | List work items where a tag was added in the last N hours/days |
| `ado-sync: Show Resolved Config` | Dump the resolved config to the Output panel (token redacted) |

### CodeLens

Every `@tc:12345` tag in a `.feature` or `.md` file gets inline links:

```gherkin
  @tc:1234
  Scenario: Login with valid credentials   ← $(link-external) View TC #1234 in ADO | $(cloud-download) Fetch TC #1234 | $(cloud-upload) Push
```

### Hover

Hover over any `@tc:` tag to see a tooltip with a direct link to Azure DevOps.

### Sidebar — ADO Test Cases

The **Testing** panel includes an **ADO Test Cases** tree that lists all spec files containing `@tc:` tags, expandable to show each linked test case with its line number.

### Status Bar

A status bar item shows the current sync state. Click it to run `ado-sync status`.

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `ado-sync.configPath` | `""` | Path to config file (relative to workspace root). Leave empty to auto-detect. |
| `ado-sync.showCodeLens` | `true` | Show CodeLens links above `@tc:` tags |
| `ado-sync.autoStatus` | `false` | Run status check automatically when a spec file is saved |

---

## Quick Start

1. Install `ado-sync` globally: `npm install -g ado-sync`
2. In your project root, run: `ado-sync init` — creates `ado-sync.json`
3. Install this extension, the Copilot agent plugin, or both
4. Open a `.feature` or `.md` spec file — `@tc:` CodeLens links appear immediately in the extension
5. Open Command Palette → `ado-sync: Validate Config` or run `/ado-sync:sync validate` in chat to confirm connectivity

---

## Output

All command output streams to the **ado-sync** Output Channel (View → Output → select `ado-sync`).

---

## License

MIT
