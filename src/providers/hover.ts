import * as vscode from 'vscode';
import { resolveConfig, parseConfigFile, buildAdoUrl } from '../config';

// Matches @tc:12345
const TC_TAG_RE = /@tc:(\d+)/;

export class AdoSyncHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /@tc:\d+/);
    if (!range) return;

    const word = document.getText(range);
    const match = TC_TAG_RE.exec(word);
    if (!match) return;

    const tcId = match[1];
    const cfg = resolveConfig();

    let adoUrl = '';
    if (cfg.exists) {
      const parsed = parseConfigFile(cfg.configPath);
      if (parsed?.orgUrl && parsed?.project) {
        adoUrl = buildAdoUrl(tcId, parsed.orgUrl, parsed.project);
      }
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`**ADO Test Case #${tcId}**\n\n`);

    if (adoUrl) {
      md.appendMarkdown(`[$(link-external) Open in Azure DevOps](${adoUrl})\n\n`);
    }

    md.appendMarkdown('---\n');
    md.appendMarkdown('`$(cloud-upload)` [Push](command:ado-sync.push) · ');
    md.appendMarkdown('`$(git-compare)` [Status](command:ado-sync.status)');

    return new vscode.Hover(md, range);
  }
}
