import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
import { staleCommand } from './commands/stale';
import { coverageCommand } from './commands/coverage';
import { startWatchCommand, stopWatchCommand, setWatchStatusBar, disposeWatch } from './commands/watch';
import { acGateCommand } from './commands/acGate';
import { trendCommand } from './commands/trend';
import { findTaggedCommand } from './commands/findTagged';
import { configShowCommand } from './commands/configShow';
import { AdoSyncCodeLensProvider } from './providers/codelens';
import { AdoSyncHoverProvider } from './providers/hover';
import { AdoSyncTreeProvider } from './sidebar/tree';
import { resolveConfig, parseConfigFile, buildAdoUrl, clearConfigCache, setConfigLogger } from './config';
import { getOutputChannel } from './runner';

const SPEC_SELECTOR: vscode.DocumentSelector = [
  { language: 'feature' },
  { pattern: '**/*.feature' },
  { pattern: '**/*.md' },
];

function logError(context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  getOutputChannel().appendLine(`[error] ${context}: ${msg}`);
}

function checkCliInstalled(): void {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const localBin = root
    ? path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'ado-sync.cmd' : 'ado-sync')
    : undefined;

  if (localBin && fs.existsSync(localBin)) return;

  // Check global install
  const globalCmd = process.platform === 'win32' ? 'where' : 'which';
  cp.execFile(globalCmd, ['ado-sync'], (err) => {
    if (err) {
      vscode.window.showWarningMessage(
        'ado-sync: CLI not found. Install it to use this extension.',
        'Install',
      ).then((action) => {
        if (action === 'Install') {
          vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/ado-sync'));
        }
      });
    }
  });
}

export function activate(extensionContext: vscode.ExtensionContext): void {
  checkCliInstalled();
  setConfigLogger((msg) => getOutputChannel().appendLine(msg));

  // ─── Providers ──────────────────────────────────────────────────────────────

  const codeLensProvider = new AdoSyncCodeLensProvider();
  const treeProvider = new AdoSyncTreeProvider();

  extensionContext.subscriptions.push(
    vscode.languages.registerCodeLensProvider(SPEC_SELECTOR, codeLensProvider),
    vscode.languages.registerHoverProvider(SPEC_SELECTOR, new AdoSyncHoverProvider()),
    vscode.window.registerTreeDataProvider('adoSyncTestCases', treeProvider),
  );

  // ─── Status bar ─────────────────────────────────────────────────────────────

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'ado-sync.status';
  statusBarItem.text = '$(beaker) ado-sync';
  statusBarItem.tooltip = 'Click to run ado-sync status';
  extensionContext.subscriptions.push(statusBarItem);

  setWatchStatusBar(statusBarItem);
  updateStatusBar(statusBarItem);

  // Refresh status bar and clear config cache when a config file is created, changed, or deleted
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    '**/{ado-sync.json,ado-sync.yml,ado-sync.yaml,azure-test-sync.json,azure-test-sync.yml,azure-test-sync.yaml}'
  );
  let _configDebounce: ReturnType<typeof setTimeout> | undefined;
  const onConfigChange = () => {
    clearTimeout(_configDebounce);
    _configDebounce = setTimeout(() => {
      clearConfigCache();
      updateStatusBar(statusBarItem);
      treeProvider.refresh();
      codeLensProvider.refresh();
    }, 300);
  };
  configWatcher.onDidCreate(onConfigChange);
  configWatcher.onDidChange(onConfigChange);
  configWatcher.onDidDelete(onConfigChange);
  extensionContext.subscriptions.push(configWatcher);

  // ─── Commands ───────────────────────────────────────────────────────────────

  extensionContext.subscriptions.push(
    vscode.commands.registerCommand('ado-sync.push', () => {
      pushCommand(false).then(() => {
        treeProvider.refresh();
        codeLensProvider.refresh();
      }).catch((err: unknown) => logError('push', err));
    }),

    vscode.commands.registerCommand('ado-sync.pushDryRun', () => {
      pushCommand(true).catch((err: unknown) => logError('pushDryRun', err));
    }),

    vscode.commands.registerCommand('ado-sync.pull', () => {
      pullCommand(false).then(() => {
        treeProvider.refresh();
        codeLensProvider.refresh();
      }).catch((err: unknown) => logError('pull', err));
    }),

    vscode.commands.registerCommand('ado-sync.pullDryRun', () => {
      pullCommand(true).catch((err: unknown) => logError('pullDryRun', err));
    }),

    vscode.commands.registerCommand('ado-sync.status', () => {
      statusCommand().catch((err: unknown) => logError('status', err));
    }),

    vscode.commands.registerCommand('ado-sync.validate', () => {
      validateCommand().catch((err: unknown) => logError('validate', err));
    }),

    vscode.commands.registerCommand('ado-sync.generate', () => {
      generateCommand().then(() => treeProvider.refresh()).catch((err: unknown) => logError('generate', err));
    }),

    vscode.commands.registerCommand('ado-sync.refreshSidebar', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('ado-sync.publishResults', () => {
      publishResultsCommand().catch((err: unknown) => logError('publishResults', err));
    }),

    vscode.commands.registerCommand('ado-sync.diff', () => {
      diffCommand().catch((err: unknown) => logError('diff', err));
    }),

    vscode.commands.registerCommand('ado-sync.init', () => {
      initCommand().catch((err: unknown) => logError('init', err));
    }),

    vscode.commands.registerCommand('ado-sync.storyContext', (storyId?: string) => {
      storyContextCommand(storyId).catch((err: unknown) => logError('storyContext', err));
    }),

    vscode.commands.registerCommand('ado-sync.fetchTestCase', (tcId?: string) => {
      fetchTestCaseCommand(tcId).catch((err: unknown) => logError('fetchTestCase', err));
    }),

    vscode.commands.registerCommand('ado-sync.stale', () => {
      staleCommand().catch((err: unknown) => logError('stale', err));
    }),

    vscode.commands.registerCommand('ado-sync.coverage', () => {
      coverageCommand().catch((err: unknown) => logError('coverage', err));
    }),

    vscode.commands.registerCommand('ado-sync.acGate', () => {
      acGateCommand().catch((err: unknown) => logError('acGate', err));
    }),

    vscode.commands.registerCommand('ado-sync.trend', () => {
      trendCommand().catch((err: unknown) => logError('trend', err));
    }),

    vscode.commands.registerCommand('ado-sync.findTagged', () => {
      findTaggedCommand().catch((err: unknown) => logError('findTagged', err));
    }),

    vscode.commands.registerCommand('ado-sync.startWatch', () => {
      startWatchCommand().catch((err: unknown) => logError('startWatch', err));
    }),

    vscode.commands.registerCommand('ado-sync.stopWatch', () => {
      stopWatchCommand();
    }),

    vscode.commands.registerCommand('ado-sync.configShow', () => {
      configShowCommand().catch((err: unknown) => logError('configShow', err));
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

  extensionContext.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const autoStatus = vscode.workspace.getConfiguration('ado-sync').get<boolean>('autoStatus', false);
      if (!autoStatus) return;

      const isSpec = doc.fileName.endsWith('.feature') || doc.fileName.endsWith('.md');
      if (isSpec) {
        statusCommand().catch((err: unknown) => logError('autoStatus', err));
      }
    }),

    vscode.workspace.onDidChangeTextDocument(() => {
      codeLensProvider.refresh();
    }),
  );
}

export function deactivate(): void {
  disposeWatch();
  getOutputChannel().dispose();
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
