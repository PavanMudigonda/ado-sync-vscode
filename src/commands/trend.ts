import { requireConfig, workspaceRoot } from '../config';
import { runCliWithProgress } from '../runner';

export async function trendCommand(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  await runCliWithProgress(
    ['trend', '--config', cfg.configPath],
    workspaceRoot()!,
    {
      title: 'ado-sync: Analyzing Test Trends...',
      successMessage: 'ado-sync: Trend analysis complete. See Output panel.',
      errorMessage: 'ado-sync: Failed to generate trend report. See Output panel.',
    },
  );
}
