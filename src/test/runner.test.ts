import { describe, it, expect, vi, afterEach } from 'vitest';
import * as cp from 'child_process';
import { EventEmitter } from 'events';

// ── Mock child_process.spawn before importing runner ─────────────────────────

const mockProc = {
  stdout: new EventEmitter(),
  stderr: new EventEmitter(),
  kill: vi.fn(),
  on: vi.fn(),
};

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProc),
  execFile: vi.fn(),
}));

// Import after mocking
const { runCli } = await import('../runner');

afterEach(() => {
  vi.clearAllMocks();
  mockProc.stdout = new EventEmitter();
  mockProc.stderr = new EventEmitter();
  mockProc.kill.mockReset();
  mockProc.on.mockReset();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function triggerClose(code: number) {
  const closeHandler = mockProc.on.mock.calls.find(([event]) => event === 'close')?.[1] as ((code: number) => void) | undefined;
  closeHandler?.(code);
}

function triggerError(err: Error) {
  const errorHandler = mockProc.on.mock.calls.find(([event]) => event === 'error')?.[1] as ((err: Error) => void) | undefined;
  errorHandler?.(err);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runCli', () => {
  it('spawns with shell:false', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'close') setTimeout(() => cb(0), 0);
    });
    await runCli(['status'], '/tmp');
    expect(cp.spawn).toHaveBeenCalledWith(
      expect.any(String),
      ['status'],
      expect.objectContaining({ shell: false }),
    );
  });

  it('resolves with exitCode 0 on success', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'close') setTimeout(() => cb(0), 0);
    });
    const result = await runCli(['status'], '/tmp');
    expect(result.exitCode).toBe(0);
  });

  it('resolves with exitCode 1 on failure', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'close') setTimeout(() => cb(1), 0);
    });
    const result = await runCli(['push'], '/tmp');
    expect(result.exitCode).toBe(1);
  });

  it('buffers stdout output', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'close') {
        setTimeout(() => {
          mockProc.stdout.emit('data', Buffer.from('hello '));
          mockProc.stdout.emit('data', Buffer.from('world'));
          cb(0);
        }, 0);
      }
    });
    const result = await runCli(['status'], '/tmp');
    expect(result.stdout).toBe('hello world');
  });

  it('buffers stderr output', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number) => void) => {
      if (event === 'close') {
        setTimeout(() => {
          mockProc.stderr.emit('data', Buffer.from('error text'));
          cb(1);
        }, 0);
      }
    });
    const result = await runCli(['push'], '/tmp');
    expect(result.stderr).toBe('error text');
  });

  it('returns exitCode:1 and helpful message on ENOENT error', async () => {
    mockProc.on.mockImplementation((event: string, cb: (err: Error) => void) => {
      if (event === 'error') {
        const err = Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
        setTimeout(() => cb(err), 0);
      }
    });
    const result = await runCli(['push'], '/tmp');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found');
  });

  it('returns exitCode:1 on generic spawn error', async () => {
    mockProc.on.mockImplementation((event: string, cb: (err: Error) => void) => {
      if (event === 'error') {
        setTimeout(() => cb(new Error('EPERM')), 0);
      }
    });
    const result = await runCli(['push'], '/tmp');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('EPERM');
  });

  it('uses exitCode 1 when close code is null', async () => {
    mockProc.on.mockImplementation((event: string, cb: (code: number | null) => void) => {
      if (event === 'close') setTimeout(() => cb(null), 0);
    });
    const result = await runCli(['status'], '/tmp');
    expect(result.exitCode).toBe(1);
  });
});
