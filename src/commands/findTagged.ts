import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function findTaggedCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const tag = await vscode.window.showInputBox({
    title: 'ado-sync: Find Tagged',
    prompt: 'Enter the tag to search for (e.g. regression)',
    validateInput: (v) => (!v.trim() ? 'Tag is required' : undefined),
  });
  if (!tag) return;

  const days = await vscode.window.showInputBox({
    title: 'ado-sync: Find Tagged',
    prompt: 'Enter the number of days to search back (e.g. 7)',
    value: '7',
    validateInput: (v) => (!/^\d+$/.test(v.trim()) ? 'Must be a number' : undefined),
  });
  if (!days) return;

  await runCliWithProgress(
    ['find-tagged', '--tag', tag.trim(), '--days', days.trim(), '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: `ado-sync: Finding items tagged '${tag}' in the last ${days} days...`,
      successMessage: 'ado-sync: Search complete. See Output panel.',
      errorMessage: 'ado-sync: Search failed. See Output panel.',
    },
  );
}
