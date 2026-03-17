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
export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage']);

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

export interface TagSettings {
  tagPrefix: string;
  linkPrefixes: string[];
}

/**
 * Read both sync.tagPrefix and sync.links[].prefix from the config file in a
 * single filesystem read. Returns defaults when no config exists or on error.
 */
export function readTagSettings(): TagSettings {
  const cfg = resolveConfig();
  if (!cfg.exists) return { tagPrefix: 'tc', linkPrefixes: [] };
  try {
    const raw = fs.readFileSync(cfg.configPath, 'utf8');
    const ext = path.extname(cfg.configPath).toLowerCase();
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      const tagPrefix: string = parsed?.sync?.tagPrefix ?? 'tc';
      const links: Array<{ prefix?: string }> = parsed?.sync?.links ?? [];
      const linkPrefixes = links.map((l) => l.prefix).filter((p): p is string => !!p);
      return { tagPrefix, linkPrefixes };
    }
    // YAML: extract with simple regexes (no js-yaml dependency in this extension)
    const tagM = raw.match(/^\s*tagPrefix\s*:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
    const tagPrefix = tagM?.[1] ?? 'tc';
    const linkMatches = raw.matchAll(/^\s*-?\s*prefix\s*:\s*['"]?([A-Za-z0-9_-]+)['"]?/gm);
    const linkPrefixes = Array.from(linkMatches, (m) => m[1]);
    return { tagPrefix, linkPrefixes };
  } catch {
    return { tagPrefix: 'tc', linkPrefixes: [] };
  }
}

/** Convenience wrapper — use readTagSettings() when you need both values. */
export function readTagPrefix(): string {
  return readTagSettings().tagPrefix;
}

/** Convenience wrapper — use readTagSettings() when you need both values. */
export function readLinkPrefixes(): string[] {
  return readTagSettings().linkPrefixes;
}

// ─── Shared string utilities used by providers ───────────────────────────────

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
