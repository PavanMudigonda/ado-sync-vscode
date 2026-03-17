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

const CONFIG_FILENAMES = [
  'ado-sync.json', 'ado-sync.yml', 'ado-sync.yaml',
  'azure-test-sync.json', 'azure-test-sync.yml', 'azure-test-sync.yaml',
];

// undefined = not yet searched, null = searched but not found, string = found path
let _configCache: string | null | undefined;

/** Invalidate the cached config path (call when a config file is created/deleted). */
export function clearConfigCache(): void {
  _configCache = undefined;
}

/**
 * Walk the workspace BFS up to MAX_SCAN_DEPTH levels deep looking for a config file.
 * Skips node_modules, .git, dist, and hidden folders.
 */
const MAX_SCAN_DEPTH = 6;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage']);

function findConfigInWorkspace(root: string): string | undefined {
  // BFS queue: [dirPath, depth]
  const queue: Array<[string, number]> = [[root, 0]];

  while (queue.length > 0) {
    const [dir, depth] = queue.shift()!;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    // Check for config files in this directory first (root preference)
    for (const name of CONFIG_FILENAMES) {
      if (entries.some((e) => e.isFile() && e.name === name)) {
        return path.join(dir, name);
      }
    }

    // Enqueue subdirectories if within depth limit
    if (depth < MAX_SCAN_DEPTH) {
      for (const entry of entries) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          queue.push([path.join(dir, entry.name), depth + 1]);
        }
      }
    }
  }

  return undefined;
}

/** Locate the ado-sync config file in the workspace (searches subdirectories). */
export function resolveConfig(): AdoSyncConfig {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return { configPath: '', exists: false };
  }

  const root = workspaceFolders[0].uri.fsPath;
  const setting = vscode.workspace.getConfiguration('ado-sync').get<string>('configPath');

  // User-specified path takes precedence — no scanning needed
  if (setting) {
    const abs = path.isAbsolute(setting) ? setting : path.join(root, setting);
    return { configPath: abs, exists: fs.existsSync(abs) };
  }

  // Return cached result if available
  if (_configCache !== undefined) {
    return _configCache
      ? { configPath: _configCache, exists: true }
      : { configPath: path.join(root, 'ado-sync.json'), exists: false };
  }

  // Scan workspace tree
  const found = findConfigInWorkspace(root);
  _configCache = found ?? null;

  return found
    ? { configPath: found, exists: true }
    : { configPath: path.join(root, 'ado-sync.json'), exists: false };
}

/** Return the workspace root or undefined. */
export function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Read sync.links[].prefix values from the workspace config file.
 * These are the link tag prefixes users configured (e.g. ['story', 'bug']).
 * Returns an empty array if not set or on error.
 */
export function readLinkPrefixes(): string[] {
  const cfg = resolveConfig();
  if (!cfg.exists) return [];
  try {
    const raw = fs.readFileSync(cfg.configPath, 'utf8');
    const ext = path.extname(cfg.configPath).toLowerCase();
    let links: Array<{ prefix?: string }> = [];
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      links = parsed?.sync?.links ?? [];
    } else {
      // YAML: extract prefix values under the links block with a simple regex
      const matches = raw.matchAll(/^\s*-?\s*prefix\s*:\s*['"]?([A-Za-z0-9_-]+)['"]?/gm);
      return Array.from(matches, (m) => m[1]);
    }
    return links.map((l) => l.prefix).filter((p): p is string => !!p);
  } catch {
    return [];
  }
}

/**
 * Read sync.tagPrefix from the workspace config file.
 * Supports JSON and YAML (yml/yaml). Returns 'tc' if not set or on error.
 */
export function readTagPrefix(): string {
  const cfg = resolveConfig();
  if (!cfg.exists) return 'tc';
  try {
    const raw = fs.readFileSync(cfg.configPath, 'utf8');
    const ext = path.extname(cfg.configPath).toLowerCase();
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      return (parsed?.sync?.tagPrefix as string | undefined) ?? 'tc';
    }
    // YAML: find the tagPrefix key under the sync block
    const m = raw.match(/^\s*tagPrefix\s*:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
    return m?.[1] ?? 'tc';
  } catch {
    return 'tc';
  }
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
