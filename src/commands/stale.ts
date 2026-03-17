import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function staleCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['stale', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Detecting stale test cases...',
    successMessage: 'ado-sync: Stale check complete. See Output panel.',
    errorMessage: 'ado-sync: Stale check failed. See Output panel.',
  });
}
