import * as vscode from 'vscode';
import { resolveConfig, parseConfigFile, buildAdoUrl, readTagPrefix, readLinkPrefixes } from '../config';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class AdoSyncHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const tagPrefix = readTagPrefix();
    const linkPrefixes = readLinkPrefixes();

    // Build a combined word pattern that matches both TC tags and link tags
    const allPrefixes = [tagPrefix, ...linkPrefixes].map(escapeRegex);
    const wordPattern = new RegExp(`@(?:${allPrefixes.join('|')}):\\d+`);
    const capturePattern = new RegExp(`@(${allPrefixes.join('|')}):(\\d+)`);

    const range = document.getWordRangeAtPosition(position, wordPattern);
    if (!range) return;

    const word = document.getText(range);
    const match = capturePattern.exec(word);
    if (!match) return;

    const prefix = match[1];
    const itemId = match[2];
    const isTestCase = prefix === tagPrefix;
    const label = isTestCase ? 'Test Case' : capitalize(prefix);

    const cfg = resolveConfig();
    let adoUrl = '';
    if (cfg.exists) {
      const parsed = parseConfigFile(cfg.configPath);
      if (parsed?.orgUrl && parsed?.project) {
        adoUrl = buildAdoUrl(itemId, parsed.orgUrl, parsed.project);
      }
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`**ADO ${label} #${itemId}**\n\n`);

    if (adoUrl) {
      md.appendMarkdown(`[$(link-external) Open in Azure DevOps](${adoUrl})\n\n`);
    }

    md.appendMarkdown('---\n');

    if (isTestCase) {
      md.appendMarkdown('`$(cloud-upload)` [Push](command:ado-sync.push) · ');
      md.appendMarkdown('`$(git-compare)` [Status](command:ado-sync.status)');
    } else {
      md.appendMarkdown(`\`$(info)\` [${label} Context](command:ado-sync.storyContext?${encodeURIComponent(JSON.stringify([itemId]))})`);
    }

    return new vscode.Hover(md, range);
  }
}
