import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function pushCommand(dryRun = false): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;
  const args = ['push', '--config', cfg.configPath];
  if (dryRun) args.push('--dry-run');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: dryRun ? 'ado-sync: Previewing push...' : 'ado-sync: Pushing specs...',
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          dryRun ? 'ado-sync: Dry run complete. See Output panel.' : 'ado-sync: Push complete.',
        );
      } else {
        vscode.window.showErrorMessage('ado-sync: Push failed. See Output panel for details.');
      }
    },
  );
}
