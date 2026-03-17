import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function generateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

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

  const format = await vscode.window.showQuickPick(
    [
      { label: 'gherkin', description: 'Gherkin .feature file (Cucumber / Playwright BDD)' },
      { label: 'markdown', description: 'Markdown .md file (prose spec)' },
    ],
    { title: 'ado-sync: Output format', placeHolder: 'Select spec format' },
  );
  if (!format) return;

  const storyIds = input.split(',').map(s => s.trim()).join(',');

  await runCliWithProgress(
    ['generate', '--story-ids', storyIds, '--format', format.label, '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: `ado-sync: Generating ${format.label} spec(s) for story ${storyIds}...`,
      successMessage: 'ado-sync: Spec(s) generated. See Output panel.',
      errorMessage: 'ado-sync: Generate failed. See Output panel for details.',
    },
  );
}
