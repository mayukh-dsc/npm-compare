import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PackageEntry } from '../../src/types.js';

vi.mock('node:https', () => {
  return {
    default: {
      get: vi.fn(),
    },
  };
});

import https from 'node:https';
import { auditRegistry } from '../../src/strategies/registry.js';

type GetCallback = (res: {
  statusCode: number;
  on: (event: string, cb: (data?: Buffer | string) => void) => void;
}) => void;

function mockHttpsGet(statusCode: number, body: object | null, error?: string) {
  vi.mocked(https.get).mockImplementationOnce((_url, _opts, callback) => {
    const cb = callback as GetCallback;
    if (error) {
      const req = {
        on: (event: string, cb: (err: Error) => void) => {
          if (event === 'error') cb(new Error(error));
          return req;
        },
        destroy: vi.fn(),
      };
      return req as unknown as ReturnType<typeof https.get>;
    }

    const chunks: string[] = body ? [JSON.stringify(body)] : [];
    cb({
      statusCode,
      on: (event: string, handler: (data?: Buffer | string) => void) => {
        if (event === 'data') chunks.forEach((c) => handler(Buffer.from(c)));
        if (event === 'end') handler();
      },
    });

    const req = {
      on: () => req,
      destroy: vi.fn(),
    };
    return req as unknown as ReturnType<typeof https.get>;
  });
}

const pkg = (overrides: Partial<PackageEntry> & { name: string }): PackageEntry => ({
  version: '1.0.0',
  integrity: 'sha512-SAFE==',
  resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
  dev: false,
  optional: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auditRegistry', () => {
  it('returns matching entry for clean package', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { integrity: 'sha512-SAFE==', shasum: 'abc', tarball: '...' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [pkg({ name: 'lodash' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.integrityMatch).toBe(true);
    expect(result.entries[0]?.isLatest).toBe(true);
    expect(result.entries[0]?.registryIntegrityMissing).toBe(false);
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('detects integrity mismatch (supply-chain attack)', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { integrity: 'sha512-REGISTRY_HASH==', shasum: 'abc', tarball: '...' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [pkg({ name: 'axios', integrity: 'sha512-TAMPERED==' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.integrityMatch).toBe(false);
    expect(result.criticalCount).toBe(1);
  });

  it('handles invalid JSON from registry', async () => {
    vi.mocked(https.get).mockImplementationOnce((_url, _opts, callback) => {
      const cb = callback as GetCallback;
      cb({
        statusCode: 200,
        on: (event: string, handler: (data?: Buffer | string) => void) => {
          if (event === 'data') handler(Buffer.from('{'));
          if (event === 'end') handler();
        },
      });
      const req = {
        on: () => req,
        destroy: vi.fn(),
      };
      return req as unknown as ReturnType<typeof https.get>;
    });

    const result = await auditRegistry(
      [pkg({ name: 'bad-json' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.error).toBe('INVALID_JSON');
  });

  it('handles request timeout', async () => {
    vi.mocked(https.get).mockImplementationOnce((_url, _opts, _callback) => {
      const req = {
        on: (event: string, fn: () => void) => {
          if (event === 'timeout') {
            queueMicrotask(fn);
          }
          return req;
        },
        destroy: vi.fn(),
      };
      return req as unknown as ReturnType<typeof https.get>;
    });

    const result = await auditRegistry(
      [pkg({ name: 'timeout-pkg' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.error).toBe('TIMEOUT');
  });

  it('handles HTTP error responses from registry', async () => {
    mockHttpsGet(500, null);

    const result = await auditRegistry(
      [pkg({ name: 'broken-registry' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.error).toBe('HTTP_500');
    expect(result.entries[0]?.integrityMatch).toBe(false);
  });

  it('handles 404 not found gracefully', async () => {
    mockHttpsGet(404, null);

    const result = await auditRegistry(
      [pkg({ name: 'private-pkg' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.notFoundOnRegistry).toBe(true);
    expect(result.entries[0]?.integrityMatch).toBe(false);
  });

  it('detects install scripts as warnings', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { integrity: 'sha512-SAFE==', shasum: 'abc', tarball: '...' },
          scripts: { postinstall: 'node ./scripts/postinstall.js' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [pkg({ name: 'some-pkg' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.hasInstallScript).toBe(true);
    expect(result.warningCount).toBe(1);
  });

  it('treats missing version in registry metadata as not found', async () => {
    const registryResponse = {
      'dist-tags': { latest: '2.0.0' },
      versions: {
        '2.0.0': {
          version: '2.0.0',
          dist: { integrity: 'sha512-only2==', shasum: 'a', tarball: 't' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [pkg({ name: 'only-newer', version: '1.0.0' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.notFoundOnRegistry).toBe(true);
    expect(result.entries[0]?.error).toBe('Version not found on registry');
  });

  it('encodes scoped package names in registry URL', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { integrity: 'sha512-SAFE==', shasum: 'a', tarball: 't' },
        },
      },
    };
    mockHttpsGet(200, registryResponse);

    await auditRegistry(
      [pkg({ name: '@scope/mypkg' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(https.get).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@scope%2Fmypkg',
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('marks non-standard registry URLs as warnings', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { integrity: 'sha512-SAFE==', shasum: 'abc', tarball: '...' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [
        pkg({
          name: 'private-pkg',
          resolved: 'https://my-company.artifactory.com/npm/private-pkg-1.0.0.tgz',
        }),
      ],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.isStandardRegistry).toBe(false);
    expect(result.warningCount).toBeGreaterThan(0);
  });

  it('flags missing registry integrity as a warning when lock file has integrity', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          version: '1.0.0',
          dist: { shasum: 'abc', tarball: '...' },
        },
      },
    };

    mockHttpsGet(200, registryResponse);

    const result = await auditRegistry(
      [pkg({ name: 'legacy-pkg', integrity: 'sha512-LOCKFILE==' })],
      'https://registry.npmjs.org',
      1,
      5000,
    );

    expect(result.entries[0]?.registryIntegrityMissing).toBe(true);
    expect(result.entries[0]?.integrityMatch).toBe(true);
    expect(result.warningCount).toBeGreaterThan(0);
  });

  it('returns empty audit for empty package list', async () => {
    const result = await auditRegistry([], 'https://registry.npmjs.org', 10, 5000);
    expect(result.entries).toHaveLength(0);
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('calls onProgress callback', async () => {
    const registryResponse = {
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': { version: '1.0.0', dist: { integrity: 'sha512-SAFE==', shasum: 'a', tarball: '' } },
      },
    };
    mockHttpsGet(200, registryResponse);

    const progress: Array<[number, number]> = [];
    await auditRegistry(
      [pkg({ name: 'foo' })],
      'https://registry.npmjs.org',
      1,
      5000,
      (c, t) => progress.push([c, t]),
    );

    expect(progress).toContainEqual([1, 1]);
  });
});
