import * as vscode from 'vscode';
import { requireConfig, readTagPrefix, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function fetchTestCaseCommand(tcId?: string): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  if (!tcId) {
    const input = await vscode.window.showInputBox({
      title: 'ado-sync: Fetch Test Case',
      prompt: 'Enter an ADO Test Case ID to pull its latest content into the matching local spec',
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

  // Use a scoped pull to refresh the local spec for just this TC.
  // The tag expression matches the @<tagPrefix>:<id> marker on the scenario.
  const tagPrefix = readTagPrefix();
  const tagExpr = `@${tagPrefix}:${tcId}`;

  await runCliWithProgress(
    ['pull', '--tags', tagExpr, '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: `ado-sync: Pulling test case #${tcId}...`,
      successMessage: `ado-sync: TC #${tcId} pulled to local spec.`,
      errorMessage: `ado-sync: Failed to pull TC #${tcId}. See Output panel.`,
    },
  );
}
