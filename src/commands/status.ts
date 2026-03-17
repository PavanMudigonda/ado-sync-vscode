import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function statusCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;
  const args = ['status', '--config', cfg.configPath];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'ado-sync: Checking status...',
      cancellable: false,
    },
    async () => {
      const result = await runCli(args, root);
      if (result.exitCode !== 0) {
        vscode.window.showErrorMessage('ado-sync: Status check failed. See Output panel.');
      }
    },
  );
}
