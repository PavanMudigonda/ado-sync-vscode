import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRoot, readTagPrefix } from '../config';

function makeTcRegex(tagPrefix: string): RegExp {
  return new RegExp(`@${tagPrefix}:(\\d+)`, 'g');
}

export class SpecFileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.resourceUri = vscode.Uri.file(filePath);
    this.contextValue = 'specFile';
    this.iconPath = new vscode.ThemeIcon('file');
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(filePath)],
    };
  }
}

export class TestCaseItem extends vscode.TreeItem {
  constructor(
    public readonly tcId: string,
    public readonly line: number,
    public readonly filePath: string,
    public readonly scenarioName?: string,
  ) {
    super(scenarioName ?? `TC #${tcId}`, vscode.TreeItemCollapsibleState.None);
    this.description = scenarioName ? `TC #${tcId}` : `line ${line + 1}`;
    this.tooltip = scenarioName ? `TC #${tcId} • line ${line + 1}` : `line ${line + 1}`;
    this.iconPath = new vscode.ThemeIcon('beaker');
    this.contextValue = 'testCase';
    this.command = {
      command: 'vscode.open',
      title: 'Go to line',
      arguments: [
        vscode.Uri.file(filePath),
        { selection: new vscode.Range(line, 0, line, 0) } as vscode.TextDocumentShowOptions,
      ],
    };
  }
}

type TreeNode = SpecFileItem | TestCaseItem;

export class AdoSyncTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      return this.getSpecFiles();
    }
    if (element instanceof SpecFileItem) {
      return this.getTestCasesInFile(element.filePath);
    }
    return [];
  }

  private getSpecFiles(): SpecFileItem[] {
    const root = workspaceRoot();
    if (!root) return [];

    const tcRe = makeTcRegex(readTagPrefix());
    const items: SpecFileItem[] = [];
    this.walkDir(root, root, items, tcRe);
    return items;
  }

  private walkDir(dir: string, root: string, items: SpecFileItem[], tcRe: RegExp): void {
    if (dir.includes('node_modules') || dir.includes('.git')) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(fullPath, root, items, tcRe);
      } else if (entry.isFile() && (entry.name.endsWith('.feature') || entry.name.endsWith('.md'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        tcRe.lastIndex = 0;
        if (tcRe.test(content)) {
          tcRe.lastIndex = 0;
          const rel = path.relative(root, fullPath);
          items.push(new SpecFileItem(rel, fullPath, vscode.TreeItemCollapsibleState.Collapsed));
        }
      }
    }
  }

  private getTestCasesInFile(filePath: string): TestCaseItem[] {
    const tcRe = makeTcRegex(readTagPrefix());
    const items: TestCaseItem[] = [];
    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      const isFeature = filePath.endsWith('.feature');
      for (let i = 0; i < lines.length; i++) {
        tcRe.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = tcRe.exec(lines[i])) !== null) {
          const scenarioName = this.findScenarioName(lines, i, isFeature);
          items.push(new TestCaseItem(match[1], i, filePath, scenarioName));
        }
      }
    } catch {
      // ignore
    }
    return items;
  }

  private findScenarioName(lines: string[], tagLine: number, isFeature: boolean): string | undefined {
    for (let j = tagLine + 1; j < Math.min(tagLine + 4, lines.length); j++) {
      const trimmed = lines[j].trim();
      if (isFeature) {
        const m = trimmed.match(/^Scenario(?:\s+Outline)?:\s*(.+)/i);
        if (m) return m[1].trim();
      } else {
        const m = trimmed.match(/^#+\s+(.+)/);
        if (m) return m[1].trim();
      }
    }
    return undefined;
  }
}
