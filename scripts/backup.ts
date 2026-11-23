import './_nodeDb';
/** npm run backup  ->  backups/backup-<timestamp>.json (git-ignored; contains private data such as contact messages). */
try { require('dotenv').config(); } catch { /* shell environment is used */ }
import fs from 'fs';
import path from 'path';
(async () => {
  const { Prisma } = await import('@prisma/client');
  const { loadModelInfo } = await import('../src/lib/backupSchema');
  const { prisma } = await import('../src/lib/prisma');
  const { createBackup } = await import('../src/lib/backup');
  const backup = await createBackup(prisma, loadModelInfo(Prisma));
  fs.mkdirSync('backups', { recursive: true });
  const file = path.join('backups', `backup-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}.json`);
  fs.writeFileSync(file, JSON.stringify(backup));
  console.log(`Backup written: ${file}`);
  for (const [t, rows] of Object.entries(backup.tables)) console.log(`  ${t}: ${rows.length}`);
  await prisma.$disconnect();
})().catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
