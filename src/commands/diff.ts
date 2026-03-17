import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function diffCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;
  const args = ['diff', '--config', cfg.configPath];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'ado-sync: Computing field-level diff...',
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode !== 0) {
        vscode.window.showErrorMessage('ado-sync: Diff failed. See Output panel.');
      }
    },
  );
}
