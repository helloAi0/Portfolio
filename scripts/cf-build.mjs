#!/usr/bin/env node
/**
 * Builds the Cloudflare bundle, then deletes any copied ".env*" files from it.
 * OpenNext copies your local .env into the bundle; production secrets must come only from `wrangler secret`,
 * so nothing from a local .env is ever uploaded.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

execSync('node node_modules/@opennextjs/cloudflare/dist/cli/index.js build', { stdio: 'inherit' });

let removed = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/^\.env(\..+)?$/.test(e.name)) { fs.rmSync(p); removed++; }
  }
};
walk('.open-next');
console.log(`Removed ${removed} copied .env file(s) from the bundle.`);
