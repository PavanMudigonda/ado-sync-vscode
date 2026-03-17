import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { workspaceRoot, readTagPrefix, escapeRegex, SKIP_DIRS } from '../config';
import { getOutputChannel } from '../runner';

function makeTcRegex(tagPrefix: string): RegExp {
  return new RegExp(`@${escapeRegex(tagPrefix)}:(\\d+)`, 'g');
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

  private async getSpecFiles(): Promise<SpecFileItem[]> {
    const root = workspaceRoot();
    if (!root) return [];

    const tagPrefix = readTagPrefix();
    const items: SpecFileItem[] = [];
    await this.walkDir(root, root, tagPrefix, items);
    return items;
  }

  private async walkDir(dir: string, root: string, tagPrefix: string, items: SpecFileItem[]): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      getOutputChannel().appendLine(`[warn] Could not read directory ${dir}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const tasks: Promise<void>[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        // Skip symlinks to prevent following cycles
        continue;
      }

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        tasks.push(this.walkDir(fullPath, root, tagPrefix, items));
      } else if (entry.isFile() && (entry.name.endsWith('.feature') || entry.name.endsWith('.md'))) {
        tasks.push((async () => {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            // Create a fresh regex per file to avoid lastIndex races with parallel tasks
            const tcRe = makeTcRegex(tagPrefix);
            if (tcRe.test(content)) {
              const rel = path.relative(root, fullPath);
              items.push(new SpecFileItem(rel, fullPath, vscode.TreeItemCollapsibleState.Collapsed));
            }
          } catch (err) {
            getOutputChannel().appendLine(`[warn] Could not read file ${fullPath}: ${err instanceof Error ? err.message : String(err)}`);
          }
        })());
      }
    }

    await Promise.all(tasks);
  }

  private async getTestCasesInFile(filePath: string): Promise<TestCaseItem[]> {
    const tcRe = makeTcRegex(readTagPrefix());
    const items: TestCaseItem[] = [];
    try {
      const lines = (await fs.promises.readFile(filePath, 'utf8')).split('\n');
      const isFeature = filePath.endsWith('.feature');
      for (let i = 0; i < lines.length; i++) {
        tcRe.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = tcRe.exec(lines[i])) !== null) {
          const scenarioName = this.findScenarioName(lines, i, isFeature);
          items.push(new TestCaseItem(match[1], i, filePath, scenarioName));
        }
      }
    } catch (err) {
      getOutputChannel().appendLine(`[warn] Could not parse test cases in ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return items;
  }

  private findScenarioName(lines: string[], tagLine: number, isFeature: boolean): string | undefined {
    // Search up to 6 lines after the tag to accommodate comments between tag and Scenario:
    for (let j = tagLine + 1; j < Math.min(tagLine + 7, lines.length); j++) {
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
