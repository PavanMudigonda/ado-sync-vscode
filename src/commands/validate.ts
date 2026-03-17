import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function validateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['validate', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Validating config...',
    successMessage: 'ado-sync: Config and Azure connection are valid.',
    errorMessage: 'ado-sync: Validation failed. See Output panel for details.',
  });
}
