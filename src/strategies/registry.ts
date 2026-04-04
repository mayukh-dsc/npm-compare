import https from 'node:https';
import type { PackageEntry, RegistryAuditEntry, RegistryAudit } from '../types.js';

interface RegistryVersionData {
  version: string;
  dist: {
    integrity?: string;
    shasum: string;
    tarball: string;
  };
  scripts?: Record<string, string>;
}

interface RegistryPackageData {
  'dist-tags': Record<string, string>;
  versions: Record<string, RegistryVersionData>;
}

function fetchJson<T>(url: string, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('NOT_FOUND'));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP_${String(res.statusCode)}`));
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error('INVALID_JSON'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });

    req.on('error', reject);
  });
}

function isStandardRegistryUrl(resolved: string): boolean {
  return (
    resolved.startsWith('https://registry.npmjs.org/') ||
    resolved.startsWith('https://registry.yarnpkg.com/')
  );
}

async function auditSingle(
  pkg: PackageEntry,
  registryUrl: string,
  timeout: number,
): Promise<RegistryAuditEntry> {
  const encodedName = pkg.name.startsWith('@')
    ? pkg.name.replace('/', '%2F')
    : pkg.name;

  const url = `${registryUrl}/${encodedName}`;
  const isStandard = isStandardRegistryUrl(pkg.resolved);

  try {
    const data = await fetchJson<RegistryPackageData>(url, timeout);
    const versionData = data.versions[pkg.version];
    const latestVersion = data['dist-tags']?.['latest'] ?? null;

    if (!versionData) {
      return {
        name: pkg.name,
        version: pkg.version,
        lockfileIntegrity: pkg.integrity,
        registryIntegrity: null,
        lockfileResolved: pkg.resolved,
        isStandardRegistry: isStandard,
        integrityMatch: false,
        latestVersion,
        isLatest: latestVersion ? pkg.version === latestVersion : null,
        notFoundOnRegistry: true,
        hasInstallScript: false,
        registryIntegrityMissing: false,
        error: 'Version not found on registry',
      };
    }

    const registryIntegrity = versionData.dist.integrity ?? null;
    const lockfileHasIntegrity = !!pkg.integrity?.trim();
    const registryIntegrityMissing =
      registryIntegrity === null && lockfileHasIntegrity;

    const integrityMatch =
      registryIntegrity !== null ? pkg.integrity === registryIntegrity : true;

    const hasInstallScript = !!(
      versionData.scripts?.['install'] ||
      versionData.scripts?.['preinstall'] ||
      versionData.scripts?.['postinstall']
    );

    return {
      name: pkg.name,
      version: pkg.version,
      lockfileIntegrity: pkg.integrity,
      registryIntegrity,
      lockfileResolved: pkg.resolved,
      isStandardRegistry: isStandard,
      integrityMatch,
      latestVersion,
      isLatest: latestVersion ? pkg.version === latestVersion : null,
      notFoundOnRegistry: false,
      hasInstallScript,
      registryIntegrityMissing,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN';
    const isNotFound = msg === 'NOT_FOUND';

    return {
      name: pkg.name,
      version: pkg.version,
      lockfileIntegrity: pkg.integrity,
      registryIntegrity: null,
      lockfileResolved: pkg.resolved,
      isStandardRegistry: isStandard,
      integrityMatch: false,
      latestVersion: null,
      isLatest: null,
      notFoundOnRegistry: isNotFound,
      hasInstallScript: false,
      registryIntegrityMissing: false,
      error: msg,
    };
  }
}

async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length) as T[];
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;
      results[taskIndex] = await tasks[taskIndex]!();
      completed++;
      onProgress?.(completed, tasks.length);
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  if (workerCount === 0) return results;

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export async function auditRegistry(
  packages: PackageEntry[],
  registryUrl: string,
  concurrency: number,
  timeout: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<RegistryAudit> {
  const tasks = packages.map((pkg) => () => auditSingle(pkg, registryUrl, timeout));
  const entries = await withConcurrency(tasks, concurrency, onProgress);

  const criticalCount = entries.filter(
    (e) => !e.integrityMatch && e.registryIntegrity !== null && !e.notFoundOnRegistry,
  ).length;

  const warningCount = entries.filter(
    (e) =>
      !e.isStandardRegistry ||
      e.notFoundOnRegistry ||
      e.hasInstallScript ||
      !!e.registryIntegrityMissing,
  ).length;

  return {
    strategy: 'registry',
    auditedAt: new Date().toISOString(),
    registryUrl,
    entries,
    criticalCount,
    warningCount,
  };
}
