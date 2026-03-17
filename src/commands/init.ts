import * as vscode from 'vscode';
import { workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function initCommand(): Promise<void> {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('ado-sync: No workspace folder open.');
    return;
  }

  const format = await vscode.window.showQuickPick(
    [
      { label: 'ado-sync.json', description: 'JSON config file (default)' },
      { label: 'ado-sync.yml',  description: 'YAML config file' },
    ],
    { title: 'ado-sync: Config file format', placeHolder: 'Select config format' },
  );
  if (!format) return;

  await runCliWithProgress(['init', format.label, '--no-interactive'], root, {
    title: `ado-sync: Creating ${format.label}...`,
    successMessage: `ado-sync: ${format.label} created. Edit it to add your ADO credentials, then run Validate Config.`,
    errorMessage: 'ado-sync: Init failed. See Output panel for details.',
    cancellable: false,
  });
}
