import * as vscode from 'vscode';
import { readTagSettings, escapeRegex, capitalize } from '../config';

export class AdoSyncCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const enabled = vscode.workspace.getConfiguration('ado-sync').get<boolean>('showCodeLens', true);
    if (!enabled) return [];

    const { tagPrefix, linkPrefixes } = readTagSettings();
    const tcRe = new RegExp(`@${escapeRegex(tagPrefix)}:(\\d+)`, 'g');
    const linkRe = linkPrefixes.length
      ? new RegExp(`@(${linkPrefixes.map(escapeRegex).join('|')}):(\\d+)`, 'g')
      : null;

    const lenses: vscode.CodeLens[] = [];
    const lines = document.getText().split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── Test case tags ─────────────────────────────────────────────────────
      tcRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = tcRe.exec(line)) !== null) {
        const tcId = match[1];
        const range = new vscode.Range(i, match.index, i, match.index + match[0].length);

        lenses.push(new vscode.CodeLens(range, {
          title: `$(link-external) View TC #${tcId} in ADO`,
          command: 'ado-sync.openInAdo',
          arguments: [tcId],
        }));
        lenses.push(new vscode.CodeLens(range, {
          title: `$(cloud-download) Fetch TC #${tcId}`,
          command: 'ado-sync.fetchTestCase',
          arguments: [tcId],
        }));
        lenses.push(new vscode.CodeLens(range, {
          title: '$(cloud-upload) Push All',
          command: 'ado-sync.push',
        }));
      }

      // ── Link tags (e.g. @story:123, @bug:456) ──────────────────────────────
      if (linkRe) {
        linkRe.lastIndex = 0;
        while ((match = linkRe.exec(line)) !== null) {
          const prefix = match[1];
          const itemId = match[2];
          const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
          const label = capitalize(prefix);

          lenses.push(new vscode.CodeLens(range, {
            title: `$(link-external) View ${label} #${itemId} in ADO`,
            command: 'ado-sync.openInAdo',
            arguments: [itemId],
          }));
          lenses.push(new vscode.CodeLens(range, {
            title: `$(info) ${label} Context #${itemId}`,
            command: 'ado-sync.storyContext',
            arguments: [itemId],
          }));
        }
      }
    }

    return lenses;
  }
}
