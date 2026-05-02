import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

let pluginScript: typeof import('../../.claude-plugin/scripts/run-ado-sync.mjs');
const tempDirs: string[] = [];

beforeAll(async () => {
  pluginScript = await import(
    pathToFileURL(
      path.join(process.cwd(), '.claude-plugin', 'scripts', 'run-ado-sync.mjs'),
    ).href
  );
});

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ado-sync-plugin-'));
  tempDirs.push(dir);
  return dir;
}

describe('ado-sync plugin runner', () => {
  it('prefers a config file at the workspace root', () => {
    const root = makeTempDir();
    const nested = path.join(root, 'packages', 'specs');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(root, 'ado-sync.json'), '{}');
    fs.writeFileSync(path.join(nested, 'ado-sync.yml'), 'sync:\n  tagPrefix: story\n');

    expect(pluginScript.findConfigInWorkspace(root)).toBe(path.join(root, 'ado-sync.json'));
  });

  it('skips config files inside node_modules', () => {
    const root = makeTempDir();
    const nested = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'ado-sync.json'), '{}');

    expect(pluginScript.findConfigInWorkspace(root)).toBeUndefined();
  });

  it('reads tagPrefix from JSON and YAML configs', () => {
    const root = makeTempDir();
    const jsonFile = path.join(root, 'ado-sync.json');
    const yamlFile = path.join(root, 'ado-sync.yml');

    fs.writeFileSync(jsonFile, JSON.stringify({ sync: { tagPrefix: 'case' } }));
    fs.writeFileSync(yamlFile, 'sync:\n  tagPrefix: story\n');

    expect(pluginScript.readTagPrefixFromConfig(jsonFile)).toBe('case');
    expect(pluginScript.readTagPrefixFromConfig(yamlFile)).toBe('story');
  });

  it('auto-appends config for config-backed commands', () => {
    const args = pluginScript.prepareCliArgs(['status'], '/workspace/ado-sync.json');
    expect(args).toEqual(['status', '--config', '/workspace/ado-sync.json']);
  });

  it('does not append config to init commands', () => {
    const args = pluginScript.prepareCliArgs(
      ['init', 'ado-sync.json', '--no-interactive'],
      '/workspace/ado-sync.json',
    );
    expect(args).toEqual(['init', 'ado-sync.json', '--no-interactive']);
  });

  it('expands fetch-test-case into a scoped pull using the configured tag prefix', () => {
    const root = makeTempDir();
    const configFile = path.join(root, 'ado-sync.json');
    fs.writeFileSync(configFile, JSON.stringify({ sync: { tagPrefix: 'story' } }));

    const args = pluginScript.prepareCliArgs(['fetch-test-case', '4321'], configFile);
    expect(args).toEqual([
      'pull',
      '--tags',
      '@story:4321',
      '--config',
      configFile,
    ]);
  });

  it('prefers a workspace-local ado-sync binary', () => {
    const root = makeTempDir();
    const binDir = path.join(root, 'node_modules', '.bin');
    const binName = process.platform === 'win32' ? 'ado-sync.cmd' : 'ado-sync';
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, binName), '');

    expect(pluginScript.resolveAdoSyncExecutable(root)).toBe(path.join(binDir, binName));
  });
});
