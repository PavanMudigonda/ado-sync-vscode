import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AdoSyncConfig {
  configPath: string;
  exists: boolean;
}

export interface AdoProjectConfig {
  orgUrl: string;
  project: string;
}

/** Read and parse the ado-sync.json config file. Returns undefined on error. */
export function parseConfigFile(configPath: string): AdoProjectConfig | undefined {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    return {
      orgUrl: (config.orgUrl ?? '').replace(/\/$/, ''),
      project: config.project ?? '',
    };
  } catch {
    return undefined;
  }
}

/** Build the Azure DevOps URL for a test case work item. */
export function buildAdoUrl(tcId: string, orgUrl: string, project: string): string {
  return `${orgUrl}/${project}/_workItems/edit/${tcId}`;
}

/** Locate the ado-sync.json config file in the workspace. */
export function resolveConfig(): AdoSyncConfig {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return { configPath: '', exists: false };
  }

  const root = workspaceFolders[0].uri.fsPath;
  const setting = vscode.workspace.getConfiguration('ado-sync').get<string>('configPath');

  // User-specified path
  if (setting) {
    const abs = path.isAbsolute(setting) ? setting : path.join(root, setting);
    return { configPath: abs, exists: fs.existsSync(abs) };
  }

  // Auto-detect
  for (const candidate of ['ado-sync.json', 'azure-test-sync.json']) {
    const abs = path.join(root, candidate);
    if (fs.existsSync(abs)) {
      return { configPath: abs, exists: true };
    }
  }

  return { configPath: path.join(root, 'ado-sync.json'), exists: false };
}

/** Return the workspace root or undefined. */
export function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** Show a friendly error when no config file is found. */
export function requireConfig(): AdoSyncConfig | undefined {
  const cfg = resolveConfig();
  if (!cfg.exists) {
    vscode.window.showErrorMessage(
      'ado-sync: No config file found. Run `ado-sync init` in your terminal to create one.',
      'Open Docs',
    ).then(action => {
      if (action === 'Open Docs') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/PavanMudigonda/ado-sync#configuration'));
      }
    });
    return undefined;
  }
  return cfg;
}
