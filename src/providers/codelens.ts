import * as vscode from 'vscode';

// Matches @tc:12345 anywhere on a line
const TC_TAG_RE = /@tc:(\d+)/g;

export class AdoSyncCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const enabled = vscode.workspace.getConfiguration('ado-sync').get<boolean>('showCodeLens', true);
    if (!enabled) return [];

    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      TC_TAG_RE.lastIndex = 0;

      while ((match = TC_TAG_RE.exec(line)) !== null) {
        const tcId = match[1];
        const range = new vscode.Range(i, match.index, i, match.index + match[0].length);

        // CodeLens: open in ADO
        lenses.push(
          new vscode.CodeLens(range, {
            title: `$(link-external) View TC #${tcId} in ADO`,
            command: 'ado-sync.openInAdo',
            arguments: [tcId],
          }),
        );

        // CodeLens: push this file
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(cloud-upload) Push',
            command: 'ado-sync.push',
          }),
        );
      }
    }

    return lenses;
  }
}
