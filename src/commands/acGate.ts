import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function acGateCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(
    ['ac-gate', '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: 'ado-sync: Validating Acceptance Criteria Gate...',
      successMessage: 'ado-sync: AC Gate passed successfully.',
      errorMessage: 'ado-sync: AC Gate failed. See Output panel for failing stories.',
    },
  );
}
