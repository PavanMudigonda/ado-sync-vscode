# ado-sync — VS Code Extension

Bidirectional sync between local test specs (`.feature`, `.md`) and Azure DevOps Test Cases, right from VS Code.

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

## Features

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

### CodeLens

Every `@tc:12345` tag in a `.feature` or `.md` file gets inline links:

```gherkin
  @tc:1234
  Scenario: Login with valid credentials   ← $(link-external) View TC #1234 in ADO | $(cloud-upload) Push
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
| `ado-sync.outputLevel` | `"normal"` | Output verbosity: `normal`, `verbose`, or `quiet` |

---

## Quick Start

1. Install `ado-sync` globally: `npm install -g ado-sync`
2. In your project root, run: `ado-sync init` — creates `ado-sync.json`
3. Install this extension
4. Open a `.feature` or `.md` spec file — `@tc:` CodeLens links appear immediately
5. Open Command Palette → `ado-sync: Validate Config` to confirm connectivity

---

## Output

All command output streams to the **ado-sync** Output Channel (View → Output → select `ado-sync`).

---

## License

MIT
