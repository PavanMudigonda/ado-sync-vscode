import * as vscode from 'vscode';
import * as fs from 'fs';

import { pushCommand } from './commands/push';
import { pullCommand } from './commands/pull';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { generateCommand } from './commands/generate';
import { AdoSyncCodeLensProvider } from './providers/codelens';
import { AdoSyncHoverProvider } from './providers/hover';
import { AdoSyncTreeProvider } from './sidebar/tree';
import { resolveConfig } from './config';

const SPEC_SELECTOR: vscode.DocumentSelector = [
  { language: 'feature' },
  { pattern: '**/*.feature' },
  { pattern: '**/*.md' },
];

export function activate(context: vscode.ExtensionContext): void {
  // ─── Providers ──────────────────────────────────────────────────────────────

  const codeLensProvider = new AdoSyncCodeLensProvider();
  const treeProvider = new AdoSyncTreeProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(SPEC_SELECTOR, codeLensProvider),
    vscode.languages.registerHoverProvider(SPEC_SELECTOR, new AdoSyncHoverProvider()),
    vscode.window.registerTreeDataProvider('adoSyncTestCases', treeProvider),
  );

  // ─── Status bar ─────────────────────────────────────────────────────────────

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'ado-sync.status';
  statusBarItem.text = '$(beaker) ado-sync';
  statusBarItem.tooltip = 'Click to run ado-sync status';
  context.subscriptions.push(statusBarItem);

  updateStatusBar(statusBarItem);

  // ─── Commands ───────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('ado-sync.push', () => {
      pushCommand(false).then(() => treeProvider.refresh());
    }),

    vscode.commands.registerCommand('ado-sync.pushDryRun', () => {
      pushCommand(true);
    }),

    vscode.commands.registerCommand('ado-sync.pull', () => {
      pullCommand(false).then(() => {
        treeProvider.refresh();
        codeLensProvider.refresh();
      });
    }),

    vscode.commands.registerCommand('ado-sync.pullDryRun', () => {
      pullCommand(true);
    }),

    vscode.commands.registerCommand('ado-sync.status', () => {
      statusCommand();
    }),

    vscode.commands.registerCommand('ado-sync.validate', () => {
      validateCommand();
    }),

    vscode.commands.registerCommand('ado-sync.generate', () => {
      generateCommand().then(() => treeProvider.refresh());
    }),

    vscode.commands.registerCommand('ado-sync.refreshSidebar', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('ado-sync.openInAdo', (tcId: string) => {
      const cfg = resolveConfig();
      if (!cfg.exists) return;

      try {
        const raw = fs.readFileSync(cfg.configPath, 'utf8');
        const config = JSON.parse(raw);
        const orgUrl: string = (config.orgUrl ?? '').replace(/\/$/, '');
        const project: string = config.project ?? '';
        if (orgUrl && project) {
          const url = `${orgUrl}/${project}/_testManagement/results?testCaseId=${tcId}`;
          vscode.env.openExternal(vscode.Uri.parse(url));
        } else {
          vscode.window.showWarningMessage('ado-sync: orgUrl or project not set in config.');
        }
      } catch {
        vscode.window.showErrorMessage('ado-sync: Could not read config file.');
      }
    }),
  );

  // ─── Auto-status on save ─────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const autoStatus = vscode.workspace.getConfiguration('ado-sync').get<boolean>('autoStatus', false);
      if (!autoStatus) return;

      const isSpec = doc.fileName.endsWith('.feature') || doc.fileName.endsWith('.md');
      if (isSpec) {
        statusCommand();
      }
    }),

    vscode.workspace.onDidChangeTextDocument(() => {
      codeLensProvider.refresh();
    }),
  );
}

export function deactivate(): void {
  // nothing to clean up — VS Code disposes subscriptions automatically
}

function updateStatusBar(item: vscode.StatusBarItem): void {
  const cfg = resolveConfig();
  if (cfg.exists) {
    item.text = '$(beaker) ado-sync';
    item.backgroundColor = undefined;
    item.show();
  } else {
    item.text = '$(warning) ado-sync: no config';
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    item.show();
  }
}
