#!/usr/bin/env node
/**
 * Render Production Build Script
 * Automatically detects whether DATABASE_URL is PostgreSQL or SQLite,
 * generates the appropriate Prisma client, applies schema synchronization,
 * and compiles the Next.js production build.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('PROJECT LAMO — RENDER PRODUCTION BUILD INITIALIZATION');
console.log('====================================================\n');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

console.log(`Detected Database Target: ${isPostgres ? 'PostgreSQL (Render Managed)' : 'SQLite (Local/Fallback)'}`);

const schemaPath = isPostgres
  ? 'prisma/schema.postgresql.prisma'
  : 'prisma/schema.prisma';

console.log(`Using Schema: ${schemaPath}`);

// Configuration check: stop the deploy early on unsafe settings (missing secrets, SQLite in production...).
const { checkDeployEnv, summarize } = await import('./deploy-check.mjs');
const checks = checkDeployEnv({ ...process.env, NODE_ENV: 'production' });
for (const c of checks.filter((c) => c.level !== 'PASS')) console.log(`[${c.level}] ${c.name}: ${c.msg}`);
if (summarize(checks).fail > 0) {
  console.error('\nDeploy configuration has failures (see above). Fix them in the Render dashboard and redeploy.');
  process.exit(1);
}

try {
  // 1. Prisma Client Generation
  console.log('\n[1/3] Generating Prisma Client...');
  execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });

  // 2. Database Migration / Schema Sync
  if (isPostgres) {
    console.log('\n[2/3] Synchronizing PostgreSQL schema on Render...');
    // No --accept-data-loss: if a schema change would delete data, the deploy stops instead of silently dropping it.
    execSync(`npx prisma db push --schema=${schemaPath}`, { stdio: 'inherit' });

    // Seed database if requested or if tables are empty
    if (process.env.AUTO_SEED === 'true') {
      console.log('Auto-seeding database...');
      try {
        execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
      } catch (seedErr) {
        console.warn('Seed warning (continuing build):', seedErr.message);
      }
    }
  } else {
    console.log('\n[2/3] Synchronizing SQLite schema...');
    execSync(`npx prisma db push --schema=${schemaPath}`, { stdio: 'inherit' });
  }

  // 3. Compile Next.js
  console.log('\n[3/3] Compiling Next.js production bundle...');
  execSync('npx next build', { stdio: 'inherit' });

  console.log('\n✓ RENDER PRODUCTION BUILD COMPLETED SUCCESSFULLY!\n');
} catch (error) {
  console.error('\n✗ RENDER PRODUCTION BUILD FAILED:', error.message);
  process.exit(1);
}
