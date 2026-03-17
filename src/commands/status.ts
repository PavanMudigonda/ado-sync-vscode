import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function statusCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['status', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Checking status...',
    errorMessage: 'ado-sync: Status check failed. See Output panel.',
  });
}
