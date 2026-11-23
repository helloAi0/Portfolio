#!/usr/bin/env node
// Generates the Prisma client after `npm install` (needed by the build). The schema's DATABASE_URL is only used for
// local scripts, so a harmless default is supplied when none is set (e.g. in Cloudflare's build environment).
import { execSync } from 'child_process';
process.env.DATABASE_URL ||= 'file:./dev.db';
try { execSync('node node_modules/prisma/build/index.js generate', { stdio: 'inherit', env: process.env }); }
catch { console.warn('prisma generate failed; run `npm run db:generate` before building.'); }
