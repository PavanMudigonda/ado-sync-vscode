# Changelog

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
