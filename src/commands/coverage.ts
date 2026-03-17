import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function coverageCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['coverage', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Computing coverage report...',
    successMessage: 'ado-sync: Coverage report complete. See Output panel.',
    errorMessage: 'ado-sync: Coverage report failed. See Output panel.',
  });
}
