# Changelog

## 0.3.1

- Patch release: re-publish of 0.3.0 with refreshed `package-lock.json` synced to the bumped `ado-sync` peer dependency floor (`>=0.1.65`); no functional changes

## 0.3.0

- **New command:** `ado-sync: AC Gate` — validate that ADO User Stories have acceptance criteria and linked test cases (CI quality gate)
- **New command:** `ado-sync: Test Run Trend Report` — analyse historical test run results to detect flaky tests and failure patterns
- **New command:** `ado-sync: Find Recently Tagged Work Items` — surface User Stories where a tag was added in the last N hours/days
- **New command:** `ado-sync: Show Resolved Config` — dump the fully resolved configuration (token redacted) to the Output panel
- **Fix:** `Fetch Test Case` no longer calls a non-existent `fetch-tc` subcommand; now performs a tag-scoped pull (`pull --tags @tc:<id>`) which actually refreshes the matching local spec
- Bumped `ado-sync` peer dependency floor to `>=0.1.65` to cover commands added in CLI 0.1.46–0.1.65 (`ac-gate`, `trend`, `find-tagged`, `config show`, `extensions`)

## 0.2.5

- **New command:** `ado-sync: Detect Stale Test Cases` — lists ADO TCs with no local spec counterpart
- **New command:** `ado-sync: Show Coverage Report` — reports spec link rate and story coverage %
- **New command:** `ado-sync: Start Watch` / `Stop Watch` — daemon mode that auto-pushes on file save; status bar reflects active watch state

## 0.2.4

- Patch release: packaging and versioning bump; no functional changes beyond 0.2.3

## 0.2.3

- Security: replaced `shell: true` with `shell: false` in subprocess spawning; added Windows `.cmd` shim support for global installs
- Reliability: added 2-minute timeout on all CLI subprocesses to prevent hangs
- Error handling: unexpected command errors now log to the ado-sync Output Channel instead of being silently swallowed
- Error handling: config parse failures now log a diagnostic message to the extension host console
- Performance: sidebar tree view now reads files asynchronously, preventing UI freezes on large projects
- Correctness: sidebar scenario name detection searches up to 6 lines after a `@tc:` tag (was 3), accommodating comments between the tag and `Scenario:` keyword
- Correctness: sidebar directory walk now skips symlinks to prevent infinite recursion on symlinked directories
- Maintenance: expanded `SKIP_DIRS` to include `.turbo`, `.parcel-cache`, `.yarn`, `.pnp`, `vendor`
- Maintenance: removed unused `ado-sync.outputLevel` configuration setting
- Refactor: extracted shared `runCliWithProgress` helper, eliminating repeated boilerplate across all 10 command files

## 0.2.2

- Added Diff command (`ado-sync: Diff`) to compute field-level diff between local specs and ADO
- Added Init command (`ado-sync: Initialize Config`) to scaffold config file from the editor
- Added Story Context command (`ado-sync: Show Story Context`) to view acceptance criteria and linked test cases for a story
- Added Fetch Test Case command (`ado-sync: Fetch Test Case`) to retrieve test case details by ID
- Added Publish Test Results command (`ado-sync: Publish Test Results`) supporting Playwright, Cucumber, JUnit, NUnit, TRX, and CTRF formats
- Config file search now uses BFS scan (up to 6 levels deep) instead of requiring config at workspace root
- Added support for `ado-sync.yml` / `ado-sync.yaml` config files
- Added support for `azure-test-sync.*` config file names
- CodeLens and hover providers refresh automatically when config changes on disk

## 0.2.0

- Added dry-run variants for Push and Pull commands
- Added `ado-sync.configPath` setting to specify config file location explicitly
- Status bar now shows warning indicator when no config file is found
- File watcher invalidates config cache on create/change/delete

## 0.1.0

- Initial release
- Command Palette: Push, Pull, Status, Validate Config, Generate Spec
- CodeLens above every `@tc:` tag — open in ADO, push shortcuts
- Hover tooltip on `@tc:` tags with ADO link
- Sidebar tree view: all spec files with linked test cases
- Status bar indicator (green when config found, warning when missing)
- Auto-detect `ado-sync.json` or `azure-test-sync.json` in workspace root
