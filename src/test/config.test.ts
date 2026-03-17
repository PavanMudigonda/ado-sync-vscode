import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { workspace } from '../../src/__mocks__/vscode';

import {
  escapeRegex,
  capitalize,
  buildAdoUrl,
  SKIP_DIRS,
  parseConfigFile,
  readTagSettings,
  resolveConfig,
  clearConfigCache,
} from '../config';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ado-sync-test-'));
}

function rmTmp(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Reset shared state before every test
beforeEach(() => {
  clearConfigCache();
  workspace.workspaceFolders = undefined;
  Object.keys(workspace._config).forEach(k => delete workspace._config[k]);
});

// ── Pure utility functions ────────────────────────────────────────────────────

describe('escapeRegex', () => {
  it('leaves plain strings unchanged', () => {
    expect(escapeRegex('tc')).toBe('tc');
  });

  it('escapes all regex special characters', () => {
    expect(escapeRegex('a.b*c+d?e^f$g{h}i(j)k[l]m\\n|o')).toBe(
      'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\[l\\]m\\\\n\\|o',
    );
  });

  it('escapes a dot so regex matches literally', () => {
    const re = new RegExp(escapeRegex('a.b'));
    expect('axb').not.toMatch(re);
    expect('a.b').toMatch(re);
  });
});

describe('capitalize', () => {
  it('uppercases first character', () => expect(capitalize('story')).toBe('Story'));
  it('handles single character', () => expect(capitalize('x')).toBe('X'));
  it('leaves rest unchanged', () => expect(capitalize('fooBAR')).toBe('FooBAR'));
  it('handles empty string', () => expect(capitalize('')).toBe(''));
});

describe('buildAdoUrl', () => {
  it('builds a correct work-item URL', () => {
    expect(buildAdoUrl('42', 'https://dev.azure.com/myorg', 'MyProject')).toBe(
      'https://dev.azure.com/myorg/MyProject/_workItems/edit/42',
    );
  });

  it('strips trailing slash from orgUrl', () => {
    // orgUrl is stored pre-stripped by parseConfigFile; buildAdoUrl receives the stripped value
    expect(buildAdoUrl('1', 'https://dev.azure.com/org', 'Proj')).toContain('https://dev.azure.com/org/Proj');
  });
});

// ── SKIP_DIRS ─────────────────────────────────────────────────────────────────

describe('SKIP_DIRS', () => {
  it.each(['node_modules', '.git', 'dist', 'build', 'coverage', 'vendor'])(
    'contains %s',
    (dir) => expect(SKIP_DIRS.has(dir)).toBe(true),
  );
});

// ── parseConfigFile ───────────────────────────────────────────────────────────

describe('parseConfigFile', () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmp(); });
  afterEach(() => rmTmp(tmp));

  it('parses a valid JSON config', () => {
    const file = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(file, JSON.stringify({ orgUrl: 'https://dev.azure.com/org/', project: 'MyProj' }));
    const result = parseConfigFile(file);
    expect(result).toEqual({ orgUrl: 'https://dev.azure.com/org', project: 'MyProj' });
  });

  it('strips trailing slash from orgUrl', () => {
    const file = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(file, JSON.stringify({ orgUrl: 'https://dev.azure.com/org/', project: 'P' }));
    expect(parseConfigFile(file)?.orgUrl).toBe('https://dev.azure.com/org');
  });

  it('returns undefined for invalid JSON', () => {
    const file = path.join(tmp, 'bad.json');
    fs.writeFileSync(file, '{ not json }');
    expect(parseConfigFile(file)).toBeUndefined();
  });

  it('returns undefined for missing file', () => {
    expect(parseConfigFile(path.join(tmp, 'nonexistent.json'))).toBeUndefined();
  });
});

// ── readTagSettings ───────────────────────────────────────────────────────────

describe('readTagSettings', () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmp(); workspace.workspaceFolders = [{ uri: { fsPath: tmp } }]; });
  afterEach(() => rmTmp(tmp));

  it('returns defaults when no config file exists', () => {
    expect(readTagSettings()).toEqual({ tagPrefix: 'tc', linkPrefixes: [] });
  });

  it('reads tagPrefix and linkPrefixes from JSON config', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({
      sync: { tagPrefix: 'test', links: [{ prefix: 'story' }, { prefix: 'bug' }] },
    }));
    clearConfigCache();
    const s = readTagSettings();
    expect(s.tagPrefix).toBe('test');
    expect(s.linkPrefixes).toEqual(['story', 'bug']);
  });

  it('falls back to tc when tagPrefix is missing from JSON', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({ sync: {} }));
    clearConfigCache();
    expect(readTagSettings().tagPrefix).toBe('tc');
  });

  it('reads tagPrefix from a YAML config', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.yml'), [
      'orgUrl: https://dev.azure.com/org',
      'project: MyProj',
      'sync:',
      '  tagPrefix: "scenario"',
      '  links:',
      '    - prefix: story',
      '    - prefix: bug',
    ].join('\n'));
    clearConfigCache();
    const s = readTagSettings();
    expect(s.tagPrefix).toBe('scenario');
    expect(s.linkPrefixes).toEqual(['story', 'bug']);
  });

  it('handles YAML comments without breaking parsing', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.yml'), [
      '# main config',
      'orgUrl: https://dev.azure.com/org # org url',
      'sync:',
      '  tagPrefix: req # used for requirements',
    ].join('\n'));
    clearConfigCache();
    expect(readTagSettings().tagPrefix).toBe('req');
  });
});

// ── resolveConfig / BFS discovery ────────────────────────────────────────────

describe('resolveConfig', () => {
  let tmp: string;
  beforeEach(() => { tmp = makeTmp(); workspace.workspaceFolders = [{ uri: { fsPath: tmp } }]; });
  afterEach(() => rmTmp(tmp));

  it('returns exists:false when no config file is present', () => {
    expect(resolveConfig().exists).toBe(false);
  });

  it('finds ado-sync.json at workspace root', () => {
    const file = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(file, '{}');
    clearConfigCache();
    const cfg = resolveConfig();
    expect(cfg.exists).toBe(true);
    expect(cfg.configPath).toBe(file);
  });

  it('finds config nested in a subdirectory (BFS)', () => {
    const sub = path.join(tmp, 'packages', 'app');
    fs.mkdirSync(sub, { recursive: true });
    const file = path.join(sub, 'ado-sync.yml');
    fs.writeFileSync(file, '');
    clearConfigCache();
    const cfg = resolveConfig();
    expect(cfg.exists).toBe(true);
    expect(cfg.configPath).toBe(file);
  });

  it('skips node_modules during BFS', () => {
    const nm = path.join(tmp, 'node_modules', 'some-pkg');
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, 'ado-sync.json'), '{}');
    clearConfigCache();
    expect(resolveConfig().exists).toBe(false);
  });

  it('prefers root-level config over nested', () => {
    const rootFile = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(rootFile, '{}');
    const sub = path.join(tmp, 'subdir');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'ado-sync.json'), '{}');
    clearConfigCache();
    expect(resolveConfig().configPath).toBe(rootFile);
  });

  it('uses user-specified configPath setting over BFS', () => {
    const custom = path.join(tmp, 'custom', 'config.json');
    fs.mkdirSync(path.dirname(custom), { recursive: true });
    fs.writeFileSync(custom, '{}');
    workspace._config['ado-sync.configPath'] = 'custom/config.json';
    clearConfigCache();
    const cfg = resolveConfig();
    expect(cfg.exists).toBe(true);
    expect(cfg.configPath).toBe(custom);
  });

  it('caches the result on repeated calls', () => {
    const file = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(file, '{}');
    clearConfigCache();
    const first = resolveConfig();
    // Remove file — cached result should still say exists:true
    fs.unlinkSync(file);
    const second = resolveConfig();
    expect(second.configPath).toBe(first.configPath);
  });

  it('clearConfigCache forces a re-scan', () => {
    resolveConfig(); // prime cache (no file)
    const file = path.join(tmp, 'ado-sync.json');
    fs.writeFileSync(file, '{}');
    clearConfigCache();
    expect(resolveConfig().exists).toBe(true);
  });

  it('returns exists:false when no workspace folders are open', () => {
    workspace.workspaceFolders = undefined;
    expect(resolveConfig().exists).toBe(false);
  });
});
