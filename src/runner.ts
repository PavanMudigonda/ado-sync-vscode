import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

  // Append outputLevel flag based on user setting
  const outputLevel = vscode.workspace.getConfiguration('ado-sync').get<string>('outputLevel', 'normal');
  const levelArgs = outputLevel === 'verbose' ? ['--verbose'] : outputLevel === 'quiet' ? ['--quiet'] : [];
  const allArgs = [...args, ...levelArgs];

  channel.appendLine(`\n$ ado-sync ${allArgs.join(' ')}\n`);

  return new Promise((resolve) => {
    // Try local node_modules/.bin first, fall back to global
    const localBin = path.join(cwd, 'node_modules', '.bin', 'ado-sync');
    const command = fs.existsSync(localBin) ? localBin : 'ado-sync';

    const proc = cp.spawn(command, allArgs, {
      cwd,
      env: { ...process.env, ...env },
      shell: true, // works on all platforms, including nvm/fnm managed Node installs
    });

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
      cancelDisposable?.dispose();
      const exitCode = code ?? 1;
      channel.appendLine(`\n[exit ${exitCode}]`);
      resolve({ stdout, stderr, exitCode });
    });

    proc.on('error', (err) => {
      cancelDisposable?.dispose();
      const msg = `Failed to start ado-sync: ${err.message}\nMake sure ado-sync is installed: npm install -g ado-sync`;
      channel.appendLine(msg);
      resolve({ stdout: '', stderr: msg, exitCode: 1 });
    });
  });
}
