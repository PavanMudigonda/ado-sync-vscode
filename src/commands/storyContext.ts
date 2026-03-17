import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function storyContextCommand(storyId?: string): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;

  if (!storyId) {
    const input = await vscode.window.showInputBox({
      title: 'ado-sync: Story Context',
      prompt: 'Enter an ADO User Story ID to view its AC items, suggested tags, and linked test cases',
      placeHolder: '1234',
      validateInput: (v) => {
        if (!v.trim()) return 'Story ID is required';
        if (!/^\d+$/.test(v.trim())) return 'Story ID must be a number';
        return undefined;
      },
    });
    if (!input) return;
    storyId = input.trim();
  }
  const args = ['story-context', '--story-id', storyId, '--config', cfg.configPath];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `ado-sync: Fetching story context for #${storyId}...`,
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode !== 0) {
        vscode.window.showErrorMessage('ado-sync: Story context failed. See Output panel.');
      }
    },
  );
}
