import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRoot } from '../config';

// Matches @tc:12345
const TC_TAG_RE = /@tc:(\d+)/g;

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
  ) {
    super(`TC #${tcId}`, vscode.TreeItemCollapsibleState.None);
    this.description = `line ${line + 1}`;
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

    const items: SpecFileItem[] = [];
    this.walkDir(root, root, items);
    return items;
  }

  private walkDir(dir: string, root: string, items: SpecFileItem[]): void {
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
        this.walkDir(fullPath, root, items);
      } else if (entry.isFile() && (entry.name.endsWith('.feature') || entry.name.endsWith('.md'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (TC_TAG_RE.test(content)) {
          TC_TAG_RE.lastIndex = 0;
          const rel = path.relative(root, fullPath);
          items.push(new SpecFileItem(rel, fullPath, vscode.TreeItemCollapsibleState.Collapsed));
        }
      }
    }
  }

  private getTestCasesInFile(filePath: string): TestCaseItem[] {
    const items: TestCaseItem[] = [];
    try {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        TC_TAG_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = TC_TAG_RE.exec(lines[i])) !== null) {
          items.push(new TestCaseItem(match[1], i, filePath));
        }
      }
    } catch {
      // ignore
    }
    return items;
  }
}
