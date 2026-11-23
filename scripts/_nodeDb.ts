/**
 * Node-only database for scripts and unit tests: Prisma through the libSQL driver adapter on a local SQLite file.
 * Import this FIRST in a script. The file defaults to DATABASE_URL (".env"), e.g. file:./dev.db
 */
import fs from 'fs';
import path from 'path';

try {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* no .env: rely on the real environment */ }

import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

let url = process.env.DATABASE_URL || 'file:./dev.db';
if (url.startsWith('file:') && !url.startsWith('file:/')) url = 'file:' + path.resolve('prisma', url.slice(5)); // relative to prisma/, like Prisma does
export const nodeDbUrl = url;
const client = new PrismaClient({ adapter: new PrismaLibSQL({ url }) as any, log: ['error'] });
(globalThis as any).__LAMO_PRISMA__ = client;
export const nodePrisma = client;
