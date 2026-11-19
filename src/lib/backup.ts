/**
 * Database backup / restore (works on SQLite and PostgreSQL through Prisma).
 * Pure helpers take a schema description so they can be unit tested without a database.
 * AdminUser and AdminSession are NEVER exported (password hashes and sessions are secrets).
 */
export const BACKUP_VERSION = 1;
export const EXCLUDED_MODELS = ['AdminUser', 'AdminSession'];

export interface ModelInfo { name: string; dateFields: string[]; bytesFields: string[]; dependsOn: string[] }

export function modelInfoFromDmmf(models: ReadonlyArray<{ name: string; fields: ReadonlyArray<{ name: string; type: string; kind: string; relationFromFields?: ReadonlyArray<string> }> }>): ModelInfo[] {
  return models
    .filter((m) => !EXCLUDED_MODELS.includes(m.name))
    .map((m) => ({
      name: m.name,
      dateFields: m.fields.filter((f) => f.type === 'DateTime').map((f) => f.name),
      bytesFields: m.fields.filter((f) => f.type === 'Bytes').map((f) => f.name),
      // a model depends on the target of every relation it owns the foreign key for
      dependsOn: m.fields.filter((f) => f.kind === 'object' && (f.relationFromFields?.length ?? 0) > 0).map((f) => f.type).filter((t) => t !== m.name && !EXCLUDED_MODELS.includes(t)),
    }));
}

/** Parents before children, so restore never violates foreign keys. */
export function orderByDependency(infos: ModelInfo[]): ModelInfo[] {
  const byName = new Map(infos.map((i) => [i.name, i]));
  const out: ModelInfo[] = [], state = new Map<string, 1 | 2>();
  const visit = (n: string) => {
    if (state.get(n) === 2 || !byName.has(n)) return;
    if (state.get(n) === 1) return; // cycle: keep going, createMany will report any real violation
    state.set(n, 1);
    byName.get(n)!.dependsOn.forEach(visit);
    state.set(n, 2);
    out.push(byName.get(n)!);
  };
  infos.forEach((i) => visit(i.name));
  return out;
}

export function serializeRow(row: Record<string, unknown>, info: ModelInfo): Record<string, unknown> {
  const o: Record<string, unknown> = { ...row };
  for (const f of info.dateFields) if (o[f] instanceof Date) o[f] = (o[f] as Date).toISOString();
  for (const f of info.bytesFields) if (o[f] != null) o[f] = Buffer.from(o[f] as Uint8Array).toString('base64');
  return o;
}

export function reviveRow(row: Record<string, unknown>, info: ModelInfo): Record<string, unknown> {
  const o: Record<string, unknown> = { ...row };
  for (const f of info.dateFields) if (typeof o[f] === 'string') o[f] = new Date(o[f] as string);
  for (const f of info.bytesFields) if (typeof o[f] === 'string') o[f] = Buffer.from(o[f] as string, 'base64');
  return o;
}

export interface BackupFile { version: number; createdAt: string; tables: Record<string, Record<string, unknown>[]> }

export function validateBackup(b: any): string | null {
  if (!b || typeof b !== 'object') return 'Not a backup file.';
  if (b.version !== BACKUP_VERSION) return `Unsupported backup version ${b?.version}.`;
  if (!b.tables || typeof b.tables !== 'object') return 'Backup has no tables.';
  for (const n of EXCLUDED_MODELS) if (n in b.tables) return `Backup contains ${n}; refusing (secrets must never be in backups).`;
  return null;
}

const delegateName = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);

export async function createBackup(prisma: any, infos: ModelInfo[]): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const info of orderByDependency(infos)) {
    const rows: Record<string, unknown>[] = await prisma[delegateName(info.name)].findMany();
    tables[info.name] = rows.map((r) => serializeRow(r, info));
  }
  return { version: BACKUP_VERSION, createdAt: new Date().toISOString(), tables };
}

export interface RestoreReport { table: string; backupRows: number; restored: number; note?: string }

/**
 * Restores into EMPTY tables only. A table that already has data is skipped (never overwritten),
 * unless `replace` is true, which first empties just the tables present in the backup. dryRun changes nothing.
 */
export async function restoreBackup(prisma: any, backup: BackupFile, infos: ModelInfo[], opts: { dryRun: boolean; replace?: boolean }): Promise<RestoreReport[]> {
  const problem = validateBackup(backup);
  if (problem) throw new Error(problem);
  const ordered = orderByDependency(infos);
  const report: RestoreReport[] = [];
  if (opts.replace && !opts.dryRun) {
    for (const info of [...ordered].reverse()) if (backup.tables[info.name]) await prisma[delegateName(info.name)].deleteMany();
  }
  for (const info of ordered) {
    const rows = backup.tables[info.name];
    if (!rows) continue;
    const d = prisma[delegateName(info.name)];
    const existing: number = await d.count();
    if (existing > 0 && !opts.replace) { report.push({ table: info.name, backupRows: rows.length, restored: 0, note: `skipped: table already has ${existing} row(s)` }); continue; }
    if (opts.dryRun) { report.push({ table: info.name, backupRows: rows.length, restored: 0, note: 'dry run' }); continue; }
    let restored = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map((r) => reviveRow(r, info));
      const res = await d.createMany({ data: chunk });
      restored += res.count;
    }
    report.push({ table: info.name, backupRows: rows.length, restored });
  }
  return report;
}
