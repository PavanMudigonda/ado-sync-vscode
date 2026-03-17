import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { workspace } from '../../src/__mocks__/vscode';
import { clearConfigCache } from '../config';
import { AdoSyncHoverProvider } from '../providers/hover';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDocAt(content: string, line: number, char: number) {
  const lines = content.split('\n');
  return {
    getText: () => content,
    lineCount: lines.length,
    getWordRangeAtPosition: (_pos: unknown, pattern: RegExp) => {
      const lineText = lines[line] ?? '';
      const match = pattern.exec(lineText);
      if (!match) return undefined;
      return { start: { line, character: match.index }, end: { line, character: match.index + match[0].length } };
    },
    getText2: (range: unknown) => {
      const r = range as { start: { line: number; character: number }; end: { character: number } };
      return lines[r.start.line].slice(r.start.character, r.end.character);
    },
  };
}

// Extend the doc to implement getText(range?)
function makeHoverDoc(content: string, tagLine = 0) {
  const lines = content.split('\n');
  return {
    getText: (range?: { start: { character: number }; end: { character: number } }) => {
      if (!range) return content;
      return lines[tagLine].slice(range.start.character, range.end.character);
    },
    lineCount: lines.length,
    getWordRangeAtPosition: (_pos: unknown, pattern: RegExp) => {
      const lineText = lines[tagLine] ?? '';
      const re = new RegExp(pattern.source, pattern.flags.replace('g', ''));
      const match = re.exec(lineText);
      if (!match) return undefined;
      return {
        start: { line: tagLine, character: match.index },
        end: { line: tagLine, character: match.index + match[0].length },
      };
    },
  };
}

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ado-hover-'));
  workspace.workspaceFolders = [{ uri: { fsPath: tmp } }];
  clearConfigCache();
  Object.keys(workspace._config).forEach(k => delete workspace._config[k]);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdoSyncHoverProvider', () => {
  it('returns undefined for a line with no @tc: tag', () => {
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('plain text here');
    const pos = { line: 0, character: 0 };
    expect(provider.provideHover(doc as never, pos as never)).toBeUndefined();
  });

  it('returns a Hover for a @tc: tag', () => {
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@tc:1234');
    const pos = { line: 0, character: 1 };
    const hover = provider.provideHover(doc as never, pos as never);
    expect(hover).toBeDefined();
  });

  it('hover content mentions the TC id', () => {
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@tc:42');
    const hover = provider.provideHover(doc as never, { line: 0, character: 1 } as never);
    expect((hover as { contents: { value: string } }).contents.value).toContain('42');
  });

  it('hover content includes ADO URL when config is present', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({
      orgUrl: 'https://dev.azure.com/myorg',
      project: 'MyProj',
    }));
    clearConfigCache();
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@tc:7');
    const hover = provider.provideHover(doc as never, { line: 0, character: 1 } as never);
    const md = (hover as { contents: { value: string } }).contents.value;
    expect(md).toContain('https://dev.azure.com/myorg');
    expect(md).toContain('MyProj');
  });

  it('hover content does not include ADO URL when no config', () => {
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@tc:7');
    const hover = provider.provideHover(doc as never, { line: 0, character: 1 } as never);
    const md = (hover as { contents: { value: string } }).contents.value;
    expect(md).not.toContain('Open in Azure DevOps');
  });

  it('hover for a link tag includes storyContext command', () => {
    fs.writeFileSync(path.join(tmp, 'ado-sync.json'), JSON.stringify({
      sync: { links: [{ prefix: 'story' }] },
    }));
    clearConfigCache();
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@story:99');
    const hover = provider.provideHover(doc as never, { line: 0, character: 1 } as never);
    const md = (hover as { contents: { value: string } }).contents.value;
    expect(md).toContain('storyContext');
    expect(md).toContain('99');
  });

  it('hover for @tc: tag includes Push and Status commands', () => {
    const provider = new AdoSyncHoverProvider();
    const doc = makeHoverDoc('@tc:1');
    const hover = provider.provideHover(doc as never, { line: 0, character: 1 } as never);
    const md = (hover as { contents: { value: string } }).contents.value;
    expect(md).toContain('ado-sync.push');
    expect(md).toContain('ado-sync.status');
  });
});
