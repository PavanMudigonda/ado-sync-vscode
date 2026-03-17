import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function fetchTestCaseCommand(tcId?: string): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  if (!tcId) {
    const input = await vscode.window.showInputBox({
      title: 'ado-sync: Fetch Test Case',
      prompt: 'Enter an ADO Test Case ID to fetch its details',
      placeHolder: '1234',
      validateInput: (v) => {
        if (!v.trim()) return 'Test Case ID is required';
        if (!/^\d+$/.test(v.trim())) return 'Test Case ID must be a number';
        return undefined;
      },
    });
    if (!input) return;
    tcId = input.trim();
  }

  await runCliWithProgress(
    ['fetch-tc', '--id', tcId, '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: `ado-sync: Fetching test case #${tcId}...`,
      successMessage: `ado-sync: TC #${tcId} fetched. See Output panel.`,
      errorMessage: `ado-sync: Failed to fetch TC #${tcId}. See Output panel.`,
    },
  );
}
