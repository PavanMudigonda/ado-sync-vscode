import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function generateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;

  // Prompt for story IDs
  const input = await vscode.window.showInputBox({
    title: 'ado-sync: Generate Spec',
    prompt: 'Enter ADO User Story ID(s), comma-separated (e.g. 1234 or 1234,5678)',
    placeHolder: '1234',
    validateInput: (value) => {
      if (!value.trim()) return 'At least one story ID is required';
      if (!/^[\d\s,]+$/.test(value)) return 'IDs must be numbers separated by commas';
      return undefined;
    },
  });

  if (!input) return;

  // Prompt for format
  const format = await vscode.window.showQuickPick(
    [
      { label: 'gherkin', description: 'Gherkin .feature file (Cucumber / Playwright BDD)' },
      { label: 'markdown', description: 'Markdown .md file (prose spec)' },
    ],
    { title: 'ado-sync: Output format', placeHolder: 'Select spec format' },
  );

  if (!format) return;

  const storyIds = input.split(',').map(s => s.trim()).join(',');
  const args = [
    'generate',
    '--story-ids', storyIds,
    '--format', format.label,
    '--config', cfg.configPath,
  ];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `ado-sync: Generating ${format.label} spec(s) for story ${storyIds}...`,
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage('ado-sync: Spec(s) generated. See Output panel.');
      } else {
        vscode.window.showErrorMessage('ado-sync: Generate failed. See Output panel for details.');
      }
    },
  );
}
