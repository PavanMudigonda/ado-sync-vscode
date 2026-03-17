import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function diffCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(['diff', '--config', cfg.configPath], workspaceRoot()!, {
    title: 'ado-sync: Computing field-level diff...',
    errorMessage: 'ado-sync: Diff failed. See Output panel.',
  });
}
