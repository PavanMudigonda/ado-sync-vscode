import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { workspace } from '../../src/__mocks__/vscode';
import { clearConfigCache } from '../config';
import { AdoSyncTreeProvider, SpecFileItem, TestCaseItem } from '../sidebar/tree';

// ── Helpers ──────────────────────────────────────────────────────────────────

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ado-tree-'));
  workspace.workspaceFolders = [{ uri: { fsPath: tmp } }];
  clearConfigCache();
  Object.keys(workspace._config).forEach(k => delete workspace._config[k]);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── findScenarioName (tested via getTestCasesInFile) ─────────────────────────

describe('AdoSyncTreeProvider — scenario name detection', () => {
  it('extracts Scenario name from a .feature file', async () => {
    const file = path.join(tmp, 'login.feature');
    fs.writeFileSync(file, [
      'Feature: Login',
      '  @tc:1',
      '  Scenario: Valid login',
      '    Given I am on the login page',
    ].join('\n'));
    const provider = new AdoSyncTreeProvider();
    const specItem = new SpecFileItem('login.feature', file, 1 as never);
    const cases = await (provider as never as { getTestCasesInFile(f: string): Promise<TestCaseItem[]> }).getTestCasesInFile(file);
    expect(cases).toHaveLength(1);
    expect(cases[0].label).toBe('Valid login');
    expect(cases[0].tcId).toBe('1');
  });

  it('extracts Scenario Outline name from a .feature file', async () => {
    const file = path.join(tmp, 'outline.feature');
    fs.writeFileSync(file, [
      'Feature: Outline',
      '  @tc:2',
      '  Scenario Outline: Login with <role>',
      '    Given I am <role>',
    ].join('\n'));
    const provider = new AdoSyncTreeProvider();
    const cases = await (provider as never as { getTestCasesInFile(f: string): Promise<TestCaseItem[]> }).getTestCasesInFile(file);
    expect(cases[0].label).toBe('Login with <role>');
  });

  it('extracts heading from a .md file', async () => {
    const file = path.join(tmp, 'spec.md');
    fs.writeFileSync(file, [
      '<!-- @tc:3 -->',
      '## My Test Heading',
    ].join('\n'));
    const provider = new AdoSyncTreeProvider();
    const cases = await (provider as never as { getTestCasesInFile(f: string): Promise<TestCaseItem[]> }).getTestCasesInFile(file);
    expect(cases[0].label).toBe('My Test Heading');
  });

  it('falls back to TC #id when no scenario follows the tag', async () => {
    const file = path.join(tmp, 'bare.feature');
    fs.writeFileSync(file, '@tc:99\n\n\n\n\n\n\n');
    const provider = new AdoSyncTreeProvider();
    const cases = await (provider as never as { getTestCasesInFile(f: string): Promise<TestCaseItem[]> }).getTestCasesInFile(file);
    expect(cases[0].label).toBe('TC #99');
  });

  it('handles multiple tags in one file', async () => {
    const file = path.join(tmp, 'multi.feature');
    fs.writeFileSync(file, [
      '@tc:10',
      'Scenario: First',
      '@tc:20',
      'Scenario: Second',
    ].join('\n'));
    const provider = new AdoSyncTreeProvider();
    const cases = await (provider as never as { getTestCasesInFile(f: string): Promise<TestCaseItem[]> }).getTestCasesInFile(file);
    expect(cases).toHaveLength(2);
    expect(cases.map(c => c.tcId)).toEqual(['10', '20']);
  });
});

// ── getSpecFiles / walkDir ────────────────────────────────────────────────────

describe('AdoSyncTreeProvider — spec file discovery', () => {
  it('returns spec files containing @tc: tags', async () => {
    fs.writeFileSync(path.join(tmp, 'a.feature'), '@tc:1\nScenario: foo');
    fs.writeFileSync(path.join(tmp, 'b.feature'), 'no tags here');
    const provider = new AdoSyncTreeProvider();
    const items = await provider.getChildren();
    expect(items).toHaveLength(1);
    expect((items[0] as SpecFileItem).label).toBe('a.feature');
  });

  it('discovers spec files in subdirectories', async () => {
    const sub = path.join(tmp, 'features');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'deep.feature'), '@tc:5\nScenario: deep');
    const provider = new AdoSyncTreeProvider();
    const items = await provider.getChildren();
    expect(items).toHaveLength(1);
    expect((items[0] as SpecFileItem).label).toBe(path.join('features', 'deep.feature'));
  });

  it('does not walk into node_modules', async () => {
    const nm = path.join(tmp, 'node_modules', 'pkg');
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, 'spec.feature'), '@tc:1\nScenario: hidden');
    const provider = new AdoSyncTreeProvider();
    const items = await provider.getChildren();
    expect(items).toHaveLength(0);
  });

  it('does not walk into hidden directories', async () => {
    const hidden = path.join(tmp, '.hidden');
    fs.mkdirSync(hidden);
    fs.writeFileSync(path.join(hidden, 'spec.feature'), '@tc:1\nScenario: hidden');
    const provider = new AdoSyncTreeProvider();
    const items = await provider.getChildren();
    expect(items).toHaveLength(0);
  });

  it('returns test cases when expanding a SpecFileItem', async () => {
    const file = path.join(tmp, 'tc.feature');
    fs.writeFileSync(file, '@tc:7\nScenario: My scenario');
    const provider = new AdoSyncTreeProvider();
    const specFiles = await provider.getChildren();
    expect(specFiles).toHaveLength(1);
    const cases = await provider.getChildren(specFiles[0] as SpecFileItem);
    expect(cases).toHaveLength(1);
    expect((cases[0] as TestCaseItem).tcId).toBe('7');
  });

  it('returns empty array when no workspace is open', async () => {
    workspace.workspaceFolders = undefined;
    const provider = new AdoSyncTreeProvider();
    expect(await provider.getChildren()).toHaveLength(0);
  });

  it('respects custom tagPrefix from config', async () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({
      sync: { tagPrefix: 'req' },
    }));
    clearConfigCache();
    fs.writeFileSync(path.join(tmp, 'spec.feature'), '@req:100\nScenario: Req test');
    const provider = new AdoSyncTreeProvider();
    const items = await provider.getChildren();
    expect(items).toHaveLength(1);
  });
});
