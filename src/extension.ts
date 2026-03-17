import * as vscode from 'vscode';

import { pushCommand } from './commands/push';
import { pullCommand } from './commands/pull';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { generateCommand } from './commands/generate';
import { publishResultsCommand } from './commands/publishResults';
import { diffCommand } from './commands/diff';
import { initCommand } from './commands/init';
import { storyContextCommand } from './commands/storyContext';
import { fetchTestCaseCommand } from './commands/fetchTestCase';
import { AdoSyncCodeLensProvider } from './providers/codelens';
import { AdoSyncHoverProvider } from './providers/hover';
import { AdoSyncTreeProvider } from './sidebar/tree';
import { resolveConfig, parseConfigFile, buildAdoUrl } from './config';

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

  // Refresh status bar if config file is created or deleted
  const configWatcher = vscode.workspace.createFileSystemWatcher('**/{ado-sync.json,azure-test-sync.json}');
  configWatcher.onDidCreate(() => updateStatusBar(statusBarItem));
  configWatcher.onDidDelete(() => updateStatusBar(statusBarItem));
  context.subscriptions.push(configWatcher);

  // ─── Commands ───────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('ado-sync.push', () => {
      pushCommand(false).then(() => {
        treeProvider.refresh();
        codeLensProvider.refresh();
      }).catch(() => { /* error shown inside pushCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.pushDryRun', () => {
      pushCommand(true).catch(() => { /* error shown inside pushCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.pull', () => {
      pullCommand(false).then(() => {
        treeProvider.refresh();
        codeLensProvider.refresh();
      }).catch(() => { /* error shown inside pullCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.pullDryRun', () => {
      pullCommand(true).catch(() => { /* error shown inside pullCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.status', () => {
      statusCommand().catch(() => { /* error shown inside statusCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.validate', () => {
      validateCommand().catch(() => { /* error shown inside validateCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.generate', () => {
      generateCommand().then(() => treeProvider.refresh()).catch(() => { /* error shown inside generateCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.refreshSidebar', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('ado-sync.publishResults', () => {
      publishResultsCommand().catch(() => { /* error shown inside publishResultsCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.diff', () => {
      diffCommand().catch(() => { /* error shown inside diffCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.init', () => {
      initCommand().catch(() => { /* error shown inside initCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.storyContext', () => {
      storyContextCommand().catch(() => { /* error shown inside storyContextCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.fetchTestCase', (tcId?: string) => {
      fetchTestCaseCommand(tcId).catch(() => { /* error shown inside fetchTestCaseCommand */ });
    }),

    vscode.commands.registerCommand('ado-sync.openInAdo', (tcId: string) => {
      const cfg = resolveConfig();
      if (!cfg.exists) return;

      const parsed = parseConfigFile(cfg.configPath);
      if (parsed?.orgUrl && parsed?.project) {
        const url = buildAdoUrl(tcId, parsed.orgUrl, parsed.project);
        vscode.env.openExternal(vscode.Uri.parse(url));
      } else {
        vscode.window.showWarningMessage('ado-sync: orgUrl or project not set in config.');
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
        statusCommand().catch(() => { /* error shown inside statusCommand */ });
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
