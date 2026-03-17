// Minimal VS Code API mock for unit tests.
// Tests can mutate `workspace.workspaceFolders` and `workspace._config` directly.

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class Uri {
  static file(fsPath: string): Uri {
    const u = new Uri();
    u.scheme = 'file';
    u.fsPath = fsPath;
    return u;
  }
  static parse(value: string): Uri {
    const u = new Uri();
    u.scheme = value.split(':')[0];
    u.fsPath = value;
    return u;
  }
  scheme = '';
  fsPath = '';
  toString(): string { return `${this.scheme}://${this.fsPath}`; }
}

export class Range {
  constructor(
    public startLine: number,
    public startCharacter: number,
    public endLine: number,
    public endCharacter: number,
  ) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class CodeLens {
  constructor(public range: Range, public command?: { title: string; command: string; arguments?: unknown[] }) {}
}

export class TreeItem {
  description?: string;
  tooltip?: string;
  iconPath?: unknown;
  resourceUri?: Uri;
  contextValue?: string;
  command?: unknown;

  constructor(public label: string, public collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None) {}
}

export class EventEmitter<T> {
  private _listeners: Array<(v: T) => void> = [];
  event = (listener: (v: T) => void): { dispose(): void } => {
    this._listeners.push(listener);
    return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
  };
  fire(value: T): void { this._listeners.forEach(l => l(value)); }
  dispose(): void { this._listeners = []; }
}

export class MarkdownString {
  private _value = '';
  isTrusted = false;
  appendMarkdown(value: string): this { this._value += value; return this; }
  get value(): string { return this._value; }
}

export class Hover {
  constructor(public contents: MarkdownString | string, public range?: Range) {}
}

// Mutable config store — tests set values here before calling code under test.
const _config: Record<string, unknown> = {};

export const workspace = {
  workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,
  _config,
  getConfiguration: (_section: string) => ({
    get: <T>(key: string, defaultValue?: T): T => {
      const fullKey = `${_section}.${key}`;
      return (fullKey in _config ? _config[fullKey] : defaultValue) as T;
    },
  }),
  onDidSaveTextDocument: () => ({ dispose: () => {} }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  createFileSystemWatcher: () => ({
    onDidCreate: () => ({ dispose: () => {} }),
    onDidChange: () => ({ dispose: () => {} }),
    onDidDelete: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
};

export const window = {
  createOutputChannel: (_name: string) => ({
    appendLine: () => {},
    append: () => {},
    show: () => {},
    dispose: () => {},
    name: _name,
  }),
  showErrorMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  showInformationMessage: () => Promise.resolve(undefined),
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    backgroundColor: undefined as unknown,
    show: () => {},
    dispose: () => {},
  }),
  withProgress: async (_opts: unknown, task: (p: unknown, t: unknown) => Promise<unknown>) =>
    task({}, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }),
  registerTreeDataProvider: () => ({ dispose: () => {} }),
};

export const languages = {
  registerCodeLensProvider: () => ({ dispose: () => {} }),
  registerHoverProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
};

export const env = {
  openExternal: () => Promise.resolve(true),
};

export interface TextDocumentShowOptions { selection?: Range }
