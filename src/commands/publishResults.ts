import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

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

  const uris = await vscode.window.showOpenDialog({
    canSelectMany: true,
    defaultUri: vscode.Uri.file(root),
    filters: { 'Test Results': ['trx', 'xml', 'json'], 'All Files': ['*'] },
    title: 'ado-sync: Select test result file(s)',
  });
  if (!uris?.length) return;

  const format = await vscode.window.showQuickPick(RESULT_FORMATS, {
    title: 'ado-sync: Result file format',
    placeHolder: 'Select the format of your test result files',
  });
  if (!format) return;

  const runName = await vscode.window.showInputBox({
    title: 'ado-sync: Test run name (optional)',
    prompt: 'Name for this test run in Azure DevOps. Press Enter to skip.',
    placeHolder: 'e.g. Smoke Tests — CI Build 42',
  });
  if (runName === undefined) return;

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

  await runCliWithProgress(args, root, {
    title: dryRun
      ? 'ado-sync: Previewing test results publish...'
      : 'ado-sync: Publishing test results to ADO...',
    successMessage: dryRun
      ? 'ado-sync: Dry run complete. See Output panel.'
      : 'ado-sync: Test results published. See Output panel for the run URL.',
    errorMessage: 'ado-sync: Publish failed. See Output panel for details.',
  });
}
