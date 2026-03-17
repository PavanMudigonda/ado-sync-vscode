import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { workspace } from '../../src/__mocks__/vscode';
import { clearConfigCache } from '../config';
import { AdoSyncCodeLensProvider } from '../providers/codelens';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDoc(content: string, fileName = '/fake/spec.feature') {
  const lines = content.split('\n');
  return {
    getText: () => content,
    fileName,
    lineCount: lines.length,
  };
}

let tmp: string;

beforeEach(() => {
  clearConfigCache();
  Object.keys(workspace._config).forEach(k => delete workspace._config[k]);
  workspace.workspaceFolders = undefined;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ado-lens-'));
  workspace.workspaceFolders = [{ uri: { fsPath: tmp } }];
});

function cleanup() { fs.rmSync(tmp, { recursive: true, force: true }); }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdoSyncCodeLensProvider', () => {
  it('returns empty array when showCodeLens is false', () => {
    workspace._config['ado-sync.showCodeLens'] = false;
    const provider = new AdoSyncCodeLensProvider();
    expect(provider.provideCodeLenses(makeDoc('@tc:1234') as never)).toHaveLength(0);
    cleanup();
  });

  it('generates three lenses per @tc: tag (View, Fetch, Push)', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const lenses = provider.provideCodeLenses(makeDoc('@tc:1234') as never);
    expect(lenses).toHaveLength(3);
    const commands = lenses.map(l => l.command?.command);
    expect(commands).toContain('ado-sync.openInAdo');
    expect(commands).toContain('ado-sync.fetchTestCase');
    expect(commands).toContain('ado-sync.push');
    cleanup();
  });

  it('passes correct tcId to openInAdo and fetchTestCase', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const lenses = provider.provideCodeLenses(makeDoc('@tc:9999') as never);
    const openLens = lenses.find(l => l.command?.command === 'ado-sync.openInAdo');
    const fetchLens = lenses.find(l => l.command?.command === 'ado-sync.fetchTestCase');
    expect(openLens?.command?.arguments).toEqual(['9999']);
    expect(fetchLens?.command?.arguments).toEqual(['9999']);
    cleanup();
  });

  it('produces lenses for every @tc: tag on a line', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const lenses = provider.provideCodeLenses(makeDoc('@tc:1 @tc:2') as never);
    expect(lenses).toHaveLength(6); // 3 per tag
    cleanup();
  });

  it('produces lenses across multiple lines', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const doc = makeDoc('@tc:1\nScenario: foo\n@tc:2\nScenario: bar');
    const lenses = provider.provideCodeLenses(doc as never);
    expect(lenses).toHaveLength(6);
    cleanup();
  });

  it('generates link lenses for custom prefix when configured', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    // Write a JSON config with a link prefix
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({
      sync: { tagPrefix: 'tc', links: [{ prefix: 'story' }] },
    }));
    clearConfigCache();
    const provider = new AdoSyncCodeLensProvider();
    provider.refresh(); // bust regex cache
    const lenses = provider.provideCodeLenses(makeDoc('@story:555') as never);
    const commands = lenses.map(l => l.command?.command);
    expect(commands).toContain('ado-sync.openInAdo');
    expect(commands).toContain('ado-sync.storyContext');
    cleanup();
  });

  it('does not produce @tc lenses for a non-matching tag', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const lenses = provider.provideCodeLenses(makeDoc('@other:1234') as never);
    expect(lenses).toHaveLength(0);
    cleanup();
  });

  it('reuses cached regexes on second call without refresh', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    const doc = makeDoc('@tc:1');
    provider.provideCodeLenses(doc as never);
    // Access private cache — same RegExp instance means no recompile
    const cached = (provider as unknown as { _cachedTcRe: RegExp })._cachedTcRe;
    provider.provideCodeLenses(doc as never);
    const cachedAfter = (provider as unknown as { _cachedTcRe: RegExp })._cachedTcRe;
    expect(cached).toBe(cachedAfter);
    cleanup();
  });

  it('invalidates regex cache after refresh()', () => {
    workspace._config['ado-sync.showCodeLens'] = true;
    const provider = new AdoSyncCodeLensProvider();
    provider.provideCodeLenses(makeDoc('@tc:1') as never);
    const before = (provider as unknown as { _cachedTcRe: RegExp })._cachedTcRe;
    provider.refresh();
    expect((provider as unknown as { _cachedTcRe: RegExp | undefined })._cachedTcRe).toBeUndefined();
    // Rebuild after next call
    provider.provideCodeLenses(makeDoc('@tc:1') as never);
    const after = (provider as unknown as { _cachedTcRe: RegExp })._cachedTcRe;
    expect(after).not.toBe(before);
    cleanup();
  });
});
