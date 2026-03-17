import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function validateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;
  const args = ['validate', '--config', cfg.configPath];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'ado-sync: Validating config...',
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage('ado-sync: Config and Azure connection are valid.');
      } else {
        vscode.window.showErrorMessage('ado-sync: Validation failed. See Output panel for details.');
      }
    },
  );
}
