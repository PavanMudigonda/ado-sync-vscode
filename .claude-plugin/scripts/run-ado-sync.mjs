#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CONFIG_FILENAMES = [
  'ado-sync.json',
  'ado-sync.yml',
  'ado-sync.yaml',
  'azure-test-sync.json',
  'azure-test-sync.yml',
  'azure-test-sync.yaml',
];

export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.turbo',
  '.parcel-cache',
  'coverage',
  'vendor',
  '.yarn',
  '.pnp',
]);

const MAX_SCAN_DEPTH = 6;
const IS_WINDOWS = process.platform === 'win32';

function usage() {
  console.error(`Usage:
  node run-ado-sync.mjs [--workspace PATH] [--config PATH] <ado-sync args...>
  node run-ado-sync.mjs [--workspace PATH] [--config PATH] --print-config-path
  node run-ado-sync.mjs [--workspace PATH] [--config PATH] --print-tag-prefix

Examples:
  node run-ado-sync.mjs validate
  node run-ado-sync.mjs push --dry-run
  node run-ado-sync.mjs generate --story-ids 1234 --format gherkin
  node run-ado-sync.mjs fetch-test-case 9876
`);
}

function parseArgs(argv) {
  const options = {
    workspace: process.cwd(),
    configPath: undefined,
    printConfigPath: false,
    printTagPrefix: false,
    commandArgs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workspace') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --workspace.');
      }
      options.workspace = value;
      i += 1;
      continue;
    }
    if (arg === '--config') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --config.');
      }
      options.configPath = value;
      i += 1;
      continue;
    }
    if (arg === '--print-config-path') {
      options.printConfigPath = true;
      continue;
    }
    if (arg === '--print-tag-prefix') {
      options.printTagPrefix = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--') {
      options.commandArgs = argv.slice(i + 1);
      return options;
    }

    options.commandArgs = argv.slice(i);
    return options;
  }

  return options;
}

export function findConfigInWorkspace(root) {
  const queue = [[root, 0]];

  while (queue.length > 0) {
    const [dir, depth] = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const name of CONFIG_FILENAMES) {
      if (entries.some((entry) => entry.isFile() && entry.name === name)) {
        return path.join(dir, name);
      }
    }

    if (depth >= MAX_SCAN_DEPTH) {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      queue.push([path.join(dir, entry.name), depth + 1]);
    }
  }

  return undefined;
}

export function resolveConfigPath(workspaceRoot, explicitConfigPath) {
  if (explicitConfigPath) {
    return path.resolve(workspaceRoot, explicitConfigPath);
  }
  return findConfigInWorkspace(workspaceRoot);
}

export function readTagPrefixFromConfig(configPath) {
  if (!configPath) {
    return 'tc';
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  if (path.extname(configPath).toLowerCase() === '.json') {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.sync?.tagPrefix ?? 'tc';
    } catch {
      return 'tc';
    }
  }

  const match = raw.match(/^\s*tagPrefix\s*:\s*["']?([^"'#\s]+)["']?/m);
  return match?.[1] ?? 'tc';
}

export function resolveAdoSyncExecutable(workspaceRoot) {
  let currentDir = workspaceRoot;
  const localBinName = IS_WINDOWS ? 'ado-sync.cmd' : 'ado-sync';

  for (;;) {
    const candidate = path.join(currentDir, 'node_modules', '.bin', localBinName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return IS_WINDOWS ? 'ado-sync.cmd' : 'ado-sync';
}

export function normalizeCommandArgs(commandArgs, configPath) {
  if (!commandArgs.length) {
    throw new Error('No ado-sync command was provided.');
  }

  const [command, ...rest] = commandArgs;
  if (command !== 'fetch-test-case') {
    return [...commandArgs];
  }

  const testCaseId = rest[0];
  if (!testCaseId || !/^\d+$/.test(testCaseId)) {
    throw new Error('fetch-test-case requires a numeric test case ID.');
  }

  const tagPrefix = readTagPrefixFromConfig(configPath);
  return ['pull', '--tags', `@${tagPrefix}:${testCaseId}`];
}

function commandNeedsConfig(commandArgs) {
  const [command] = commandArgs;
  if (!command) {
    return false;
  }

  return !new Set(['init', 'help', '--help', '-h', 'version', '--version']).has(command);
}

export function prepareCliArgs(commandArgs, configPath) {
  const normalized = normalizeCommandArgs(commandArgs, configPath);
  if (!commandNeedsConfig(normalized) || normalized.includes('--config')) {
    return normalized;
  }
  if (!configPath) {
    throw new Error(
      'No ado-sync config file was found in this workspace. Create one with `ado-sync init` first.',
    );
  }
  return [...normalized, '--config', configPath];
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const workspaceRoot = path.resolve(options.workspace);
  const configPath = resolveConfigPath(workspaceRoot, options.configPath);

  if (options.printConfigPath) {
    if (!configPath) {
      console.error('No ado-sync config file was found in this workspace.');
      return 1;
    }
    console.log(configPath);
    return 0;
  }

  if (options.printTagPrefix) {
    if (!configPath) {
      console.error('No ado-sync config file was found in this workspace.');
      return 1;
    }
    console.log(readTagPrefixFromConfig(configPath));
    return 0;
  }

  if (!options.commandArgs.length) {
    usage();
    return 1;
  }

  const executable = resolveAdoSyncExecutable(workspaceRoot);
  const cliArgs = prepareCliArgs(options.commandArgs, configPath);

  return new Promise((resolve) => {
    const child = spawn(executable, cliArgs, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        console.error(
          'ado-sync CLI not found. Install it with `npm install -g ado-sync` or add it to your workspace.',
        );
      } else {
        console.error(`Failed to start ado-sync: ${error.message}`);
      }
      resolve(1);
    });

    child.on('close', (code) => resolve(code ?? 1));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await main();
  process.exit(exitCode);
}
