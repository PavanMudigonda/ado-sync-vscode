import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const IS_WINDOWS = process.platform === 'win32';
/** Kill the subprocess if it doesn't finish within this duration. */
const SPAWN_TIMEOUT_MS = 120_000; // 2 minutes

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('ado-sync');
  }
  return outputChannel;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Spawn `ado-sync <args>` as a child process, streaming output to the
 * Output Channel, and resolving with exit code + buffered output.
 */
export async function runCli(
  args: string[],
  cwd: string,
  env?: Record<string, string>,
  token?: vscode.CancellationToken,
): Promise<RunResult> {
  const channel = getOutputChannel();
  channel.show(true);
  channel.appendLine(`\n$ ado-sync ${args.join(' ')}\n`);

  return new Promise((resolve) => {
    // Try local node_modules/.bin first, fall back to global.
    // On Windows npm CLI wrappers use a .cmd shim; use shell: false for security.
    const localBinName = IS_WINDOWS ? 'ado-sync.cmd' : 'ado-sync';
    const globalCmd = IS_WINDOWS ? 'ado-sync.cmd' : 'ado-sync';
    const localBin = path.join(cwd, 'node_modules', '.bin', localBinName);
    const command = fs.existsSync(localBin) ? localBin : globalCmd;

    const proc = cp.spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
    });

    // Kill the process if it exceeds the timeout
    const timeoutHandle = setTimeout(() => {
      proc.kill();
      channel.appendLine(`\n[timeout: process killed after ${SPAWN_TIMEOUT_MS / 1000}s]`);
    }, SPAWN_TIMEOUT_MS);

    // Wire up cancellation
    const cancelDisposable = token?.onCancellationRequested(() => {
      proc.kill();
      channel.appendLine('\n[cancelled]');
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      channel.append(text);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      channel.append(text);
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutHandle);
      cancelDisposable?.dispose();
      const exitCode = code ?? 1;
      channel.appendLine(`\n[exit ${exitCode}]`);
      resolve({ stdout, stderr, exitCode });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutHandle);
      cancelDisposable?.dispose();
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        const msg = 'ado-sync CLI not found. Run: npm install -g ado-sync';
        channel.appendLine(msg);
        vscode.window.showWarningMessage(
          'ado-sync: CLI not found. Install it to use this extension.',
          'Install',
        ).then((action) => {
          if (action === 'Install') {
            vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/ado-sync'));
          }
        });
        resolve({ stdout: '', stderr: msg, exitCode: 1 });
      } else {
        const msg = `Failed to start ado-sync: ${err.message}`;
        channel.appendLine(msg);
        resolve({ stdout: '', stderr: msg, exitCode: 1 });
      }
    });
  });
}

/**
 * Run a CLI command wrapped in a VS Code progress notification.
 * Shows a success or error message based on the exit code.
 * Returns undefined if the operation was cancelled.
 */
export async function runCliWithProgress(
  args: string[],
  cwd: string,
  options: {
    title: string;
    successMessage?: string;
    errorMessage: string;
    cancellable?: boolean;
  },
  env?: Record<string, string>,
): Promise<RunResult | undefined> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: options.title,
      cancellable: options.cancellable ?? true,
    },
    async (_, token) => {
      const result = await runCli(args, cwd, env, token);
      if (token.isCancellationRequested) return undefined;
      if (result.exitCode === 0) {
        if (options.successMessage) {
          vscode.window.showInformationMessage(options.successMessage);
        }
      } else {
        vscode.window.showErrorMessage(options.errorMessage);
      }
      return result;
    },
  );
}
