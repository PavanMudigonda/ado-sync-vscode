import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function trendCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const days = await vscode.window.showInputBox({
    title: 'ado-sync: Trend — period (days)',
    prompt: 'How many days of test run history to analyse',
    value: '30',
    validateInput: (v) => (/^\d+$/.test(v.trim()) ? undefined : 'Must be a positive integer'),
  });
  if (!days) return;

  const maxRuns = await vscode.window.showInputBox({
    title: 'ado-sync: Trend — max runs',
    prompt: 'Maximum number of test runs to sample',
    value: '50',
    validateInput: (v) => (/^\d+$/.test(v.trim()) ? undefined : 'Must be a positive integer'),
  });
  if (!maxRuns) return;

  const args = [
    'trend',
    '--config', cfg.configPath,
    '--days', days.trim(),
    '--max-runs', maxRuns.trim(),
  ];

  await runCliWithProgress(args, workspaceRoot()!, {
    title: `ado-sync: Analysing test run trends (last ${days} days)...`,
    successMessage: 'ado-sync: Trend report complete. See Output panel.',
    errorMessage: 'ado-sync: Trend report failed. See Output panel.',
  });
}
