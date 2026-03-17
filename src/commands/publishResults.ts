import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

const RESULT_FORMATS = [
  { label: 'playwrightJson', description: 'Playwright JSON reporter output' },
  { label: 'cucumberJson',   description: 'Cucumber JSON formatter output' },
  { label: 'trx',            description: 'MSTest / VS Test (.trx)' },
  { label: 'junit',          description: 'JUnit XML' },
  { label: 'nunitXml',       description: 'NUnit XML' },
  { label: 'ctrfJson',       description: 'CTRF JSON (Cloud Test Results Format)' },
];

export async function publishResultsCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;

  // Step 1: Select result file(s)
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: true,
    defaultUri: vscode.Uri.file(root),
    filters: { 'Test Results': ['trx', 'xml', 'json'], 'All Files': ['*'] },
    title: 'ado-sync: Select test result file(s)',
  });
  if (!uris?.length) return;

  // Step 2: Select format
  const format = await vscode.window.showQuickPick(RESULT_FORMATS, {
    title: 'ado-sync: Result file format',
    placeHolder: 'Select the format of your test result files',
  });
  if (!format) return;

  // Step 3: Optional run name (Escape = cancel, empty string = skip)
  const runName = await vscode.window.showInputBox({
    title: 'ado-sync: Test run name (optional)',
    prompt: 'Name for this test run in Azure DevOps. Press Enter to skip.',
    placeHolder: 'e.g. Smoke Tests — CI Build 42',
  });
  if (runName === undefined) return;

  // Step 4: Dry run?
  const dryRunChoice = await vscode.window.showQuickPick(
    [
      { label: 'No',  description: 'Publish results to Azure DevOps' },
      { label: 'Yes', description: 'Preview only — do not publish' },
    ],
    { title: 'ado-sync: Dry run?' },
  );
  if (!dryRunChoice) return;
  const dryRun = dryRunChoice.label === 'Yes';

  const args = ['publish-test-results', '--config', cfg.configPath];
  for (const uri of uris) {
    args.push('--testResult', uri.fsPath);
  }
  args.push('--testResultFormat', format.label);
  if (runName) args.push('--runName', runName);
  if (dryRun) args.push('--dry-run');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: dryRun
        ? 'ado-sync: Previewing test results publish...'
        : 'ado-sync: Publishing test results to ADO...',
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          dryRun
            ? 'ado-sync: Dry run complete. See Output panel.'
            : 'ado-sync: Test results published. See Output panel for the run URL.',
        );
      } else {
        vscode.window.showErrorMessage('ado-sync: Publish failed. See Output panel for details.');
      }
    },
  );
}
