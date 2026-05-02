import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function acGateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const scope = await vscode.window.showQuickPick(
    [
      { label: 'All active stories', description: 'Default — Active, Resolved, and Closed states' },
      { label: 'Specific story IDs',  description: 'Comma-separated ADO work item IDs' },
      { label: 'Area path',           description: 'All User Stories under an area path' },
      { label: 'WIQL query',          description: 'Stories selected by a WIQL query' },
    ],
    { title: 'ado-sync: AC Gate scope', placeHolder: 'Select stories to validate' },
  );
  if (!scope) return;

  const args = ['ac-gate', '--config', cfg.configPath];

  if (scope.label === 'Specific story IDs') {
    const ids = await vscode.window.showInputBox({
      title: 'ado-sync: AC Gate — story IDs',
      prompt: 'Enter ADO User Story IDs, comma-separated (e.g. 1234,5678)',
      placeHolder: '1234,5678',
      validateInput: (v) => (/^[\d\s,]+$/.test(v) ? undefined : 'IDs must be numbers separated by commas'),
    });
    if (!ids) return;
    args.push('--story-ids', ids.split(',').map((s) => s.trim()).join(','));
  } else if (scope.label === 'Area path') {
    const areaPath = await vscode.window.showInputBox({
      title: 'ado-sync: AC Gate — area path',
      prompt: 'Enter an ADO area path (e.g. "MyProject\\Team A")',
      placeHolder: 'MyProject\\Team A',
    });
    if (!areaPath) return;
    args.push('--area-path', areaPath);
  } else if (scope.label === 'WIQL query') {
    const wiql = await vscode.window.showInputBox({
      title: 'ado-sync: AC Gate — WIQL',
      prompt: 'Enter a WIQL query selecting User Stories',
      placeHolder: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'User Story'",
    });
    if (!wiql) return;
    args.push('--query', wiql);
  }

  const failMode = await vscode.window.showQuickPick(
    [
      { label: 'No', description: 'Report only — do not fail on missing AC' },
      { label: 'Yes', description: 'Exit non-zero when stories have no AC (CI gate)' },
    ],
    { title: 'ado-sync: Fail on missing AC?' },
  );
  if (!failMode) return;
  if (failMode.label === 'Yes') args.push('--fail-on-no-ac');

  await runCliWithProgress(args, workspaceRoot()!, {
    title: 'ado-sync: Running AC gate...',
    successMessage: 'ado-sync: AC gate passed. See Output panel.',
    errorMessage: 'ado-sync: AC gate failed. See Output panel for details.',
  });
}
