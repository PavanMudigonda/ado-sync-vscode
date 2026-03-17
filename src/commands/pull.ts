import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function pullCommand(dryRun = false): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;
  const args = ['pull', '--config', cfg.configPath];
  if (dryRun) args.push('--dry-run');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: dryRun ? 'ado-sync: Previewing pull...' : 'ado-sync: Pulling from ADO...',
      cancellable: false,
    },
    async () => {
      const result = await runCli(args, root);
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          dryRun ? 'ado-sync: Dry run complete. See Output panel.' : 'ado-sync: Pull complete.',
        );
      } else {
        vscode.window.showErrorMessage('ado-sync: Pull failed. See Output panel for details.');
      }
    },
  );
}
