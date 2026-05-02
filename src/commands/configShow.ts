import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function configShowCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['config', 'show', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Resolving config...',
    successMessage: 'ado-sync: Config dumped to Output panel (token redacted).',
    errorMessage: 'ado-sync: Config show failed. See Output panel.',
  });
}
