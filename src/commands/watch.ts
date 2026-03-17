import * as vscode from 'vscode';
import { requireConfig, workspaceRoot } from '../config';
import { spawnCliBackground, BackgroundProcess } from '../runner';

let _proc: BackgroundProcess | undefined;
let _statusBar: vscode.StatusBarItem | undefined;

export function setWatchStatusBar(item: vscode.StatusBarItem): void {
  _statusBar = item;
}

export function isWatching(): boolean {
  return _proc !== undefined;
}

export function disposeWatch(): void {
  if (_proc) {
    _proc.kill();
    _proc = undefined;
  }
}

function syncStatusBar(): void {
  if (!_statusBar) return;
  if (_proc) {
    _statusBar.text = '$(eye) ado-sync: watching';
    _statusBar.tooltip = 'Auto-pushing on file changes — click to stop';
    _statusBar.command = 'ado-sync.stopWatch';
    _statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    _statusBar.text = '$(beaker) ado-sync';
    _statusBar.tooltip = 'Click to run ado-sync status';
    _statusBar.command = 'ado-sync.status';
    _statusBar.backgroundColor = undefined;
  }
}

export async function startWatchCommand(): Promise<void> {
  if (_proc) {
    vscode.window.showWarningMessage('ado-sync: Watch is already running. Use "Stop Watch" to end it.');
    return;
  }

  const cfg = requireConfig();
  if (!cfg) return;

  _proc = spawnCliBackground(
    ['watch', '--config', cfg.configPath],
    workspaceRoot()!,
    () => {
      // Process exited on its own (error or natural end)
      _proc = undefined;
      syncStatusBar();
    },
  );

  syncStatusBar();
  vscode.window.showInformationMessage('ado-sync: Watch started — auto-pushing on file changes.');
}

export function stopWatchCommand(): void {
  if (!_proc) {
    vscode.window.showWarningMessage('ado-sync: Watch is not running.');
    return;
  }

  _proc.kill();
  _proc = undefined;
  syncStatusBar();
  vscode.window.showInformationMessage('ado-sync: Watch stopped.');
}
