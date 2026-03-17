import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function pullCommand(dryRun = false): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const args = ['pull', '--config', cfg.configPath];
  if (dryRun) args.push('--dry-run');

  await runCliWithProgress(args, workspaceRoot()!, {
    title: dryRun ? 'ado-sync: Previewing pull...' : 'ado-sync: Pulling from ADO...',
    successMessage: dryRun ? 'ado-sync: Dry run complete. See Output panel.' : 'ado-sync: Pull complete.',
    errorMessage: 'ado-sync: Pull failed. See Output panel for details.',
  });
}
