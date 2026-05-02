import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function findTaggedCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const tag = await vscode.window.showInputBox({
    title: 'ado-sync: Find Tagged — tag name',
    prompt: 'The tag to search for (e.g. "regression")',
    placeHolder: 'regression',
    validateInput: (v) => (v.trim() ? undefined : 'Tag is required'),
  });
  if (!tag) return;

  const windowChoice = await vscode.window.showQuickPick(
    [
      { label: 'Hours', description: 'Find items where the tag was added in the last N hours' },
      { label: 'Days',  description: 'Find items where the tag was added in the last N days' },
    ],
    { title: 'ado-sync: Find Tagged — time window' },
  );
  if (!windowChoice) return;

  const valueLabel = windowChoice.label.toLowerCase();
  const value = await vscode.window.showInputBox({
    title: `ado-sync: Find Tagged — last N ${valueLabel}`,
    prompt: `How many ${valueLabel} back to search`,
    value: valueLabel === 'hours' ? '24' : '7',
    validateInput: (v) => (/^\d+(\.\d+)?$/.test(v.trim()) ? undefined : 'Must be a positive number'),
  });
  if (!value) return;

  const workItemType = await vscode.window.showInputBox({
    title: 'ado-sync: Find Tagged — work item type',
    prompt: 'Work item type to search',
    value: 'User Story',
  });
  if (workItemType === undefined) return;

  const args = [
    'find-tagged',
    '--config', cfg.configPath,
    '--tag', tag.trim(),
    `--${valueLabel}`, value.trim(),
  ];
  if (workItemType.trim()) args.push('--work-item-type', workItemType.trim());

  await runCliWithProgress(args, workspaceRoot()!, {
    title: `ado-sync: Searching for "${tag}" tag...`,
    successMessage: 'ado-sync: Find tagged complete. See Output panel.',
    errorMessage: 'ado-sync: Find tagged failed. See Output panel.',
  });
}
