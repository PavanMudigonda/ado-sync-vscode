import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function storyContextCommand(storyId?: string): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

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

  await runCliWithProgress(
    ['story-context', '--story-id', storyId, '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: `ado-sync: Fetching story context for #${storyId}...`,
      successMessage: `ado-sync: Story context for #${storyId} ready. See Output panel.`,
      errorMessage: 'ado-sync: Story context failed. See Output panel.',
    },
  );
}
