import './_nodeDb';
/**
 * npm run restore -- backups/backup-....json            (dry run: shows what would happen, changes nothing)
 * npm run restore -- backups/backup-....json --apply    (restores into EMPTY tables only; tables with data are skipped)
 * npm run restore -- backups/backup-....json --apply --replace   (empties the tables in the file first. Destructive.)
 */
try { require('dotenv').config(); } catch { /* shell environment is used */ }
import fs from 'fs';
(async () => {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) { console.error('Usage: npm run restore -- <backup.json> [--apply] [--replace]'); process.exit(1); }
  const { Prisma } = await import('@prisma/client');
  const { loadModelInfo } = await import('../src/lib/backupSchema');
  const { prisma } = await import('../src/lib/prisma');
  const { restoreBackup } = await import('../src/lib/backup');
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = flags.includes('--apply'), replace = flags.includes('--replace');
  const report = await restoreBackup(prisma, backup, loadModelInfo(Prisma), { dryRun: !apply, replace });
  console.log(apply ? 'RESTORE APPLIED' : 'DRY RUN (add --apply to restore)');
  for (const r of report) console.log(`  ${r.table}: ${r.restored}/${r.backupRows}${r.note ? ' (' + r.note + ')' : ''}`);
  await prisma.$disconnect();
})().catch((e) => { console.error('Restore failed:', e.message); process.exit(1); });
