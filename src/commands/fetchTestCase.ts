import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCli } from '../runner';

export async function fetchTestCaseCommand(tcId?: string): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const root = workspaceRoot()!;

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

  const args = ['fetch-tc', '--id', tcId, '--config', cfg.configPath];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `ado-sync: Fetching test case #${tcId}...`,
      cancellable: true,
    },
    async (_, token) => {
      const result = await runCli(args, root, undefined, token);
      if (token.isCancellationRequested) return;
      if (result.exitCode !== 0) {
        vscode.window.showErrorMessage(`ado-sync: Failed to fetch TC #${tcId}. See Output panel.`);
      }
    },
  );
}
