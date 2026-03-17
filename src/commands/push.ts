import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function pushCommand(dryRun = false): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const args = ['push', '--config', cfg.configPath];
  if (dryRun) args.push('--dry-run');

  await runCliWithProgress(args, workspaceRoot()!, {
    title: dryRun ? 'ado-sync: Previewing push...' : 'ado-sync: Pushing specs...',
    successMessage: dryRun ? 'ado-sync: Dry run complete. See Output panel.' : 'ado-sync: Push complete.',
    errorMessage: 'ado-sync: Push failed. See Output panel for details.',
  });
}
