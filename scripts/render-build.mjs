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

try {
  // 1. Prisma Client Generation
  console.log('\n[1/3] Generating Prisma Client...');
  execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });

  // 2. Database Migration / Schema Sync
  if (isPostgres) {
    console.log('\n[2/3] Synchronizing PostgreSQL schema on Render...');
    execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, { stdio: 'inherit' });

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
