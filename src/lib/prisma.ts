import type { PrismaClient } from '@prisma/client';
// The WebAssembly build of the client is the one that runs inside a Cloudflare Worker (no native engine).
import { PrismaD1 } from '@prisma/adapter-d1';

/**
 * Database access.
 *  - On Cloudflare (and in `next dev` through the Cloudflare dev proxy) the client talks to the D1 binding named `DB`.
 *  - In Node scripts and unit tests, scripts/_nodeDb.ts installs a client on globalThis.__LAMO_PRISMA__ first.
 * `prisma` is a thin proxy so the right client is resolved per request, never at import time (build-safe).
 */
// Production (Cloudflare Worker) needs the WebAssembly build of the client; `next dev` runs in Node, where that build cannot
// load its .wasm file, so development uses the regular client. The condition is a build-time constant, so the unused branch is dropped.
const WorkerPrismaClient: typeof import('@prisma/client').PrismaClient =
  process.env.NODE_ENV === 'development' ? require('@prisma/client').PrismaClient : require('@prisma/client/wasm').PrismaClient;
const g = globalThis as unknown as { __LAMO_PRISMA__?: PrismaClient };
const perBinding = new WeakMap<object, PrismaClient>();

function cloudflareDb(): object | undefined {
  const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  return ctx?.env?.DB;
}

/**
 * `next dev` hands Cloudflare vars and secrets (.dev.vars, wrangler.jsonc "vars") to the app only as bindings, while the code
 * reads process.env like on the deployed Worker. Mirror them once so login, Gemini, GitHub and the rest work locally too.
 */
let hydrated = false;
function hydrateEnv() {
  if (hydrated || process.env.NODE_ENV !== 'development') return;
  const env = (globalThis as any)[Symbol.for('__cloudflare-context__')]?.env;
  if (!env) return;
  hydrated = true;
  for (const [k, v] of Object.entries(env)) if (typeof v === 'string' && v !== '' && !process.env[k]) process.env[k] = v;
}

function resolve(): PrismaClient {
  hydrateEnv();
  if (g.__LAMO_PRISMA__) return g.__LAMO_PRISMA__;
  const db = cloudflareDb();
  if (!db) throw new Error('No database: the D1 binding "DB" is missing (see wrangler.jsonc).');
  let client = perBinding.get(db) as PrismaClient | undefined;
  if (!client) {
    client = new WorkerPrismaClient({ adapter: new PrismaD1(db as any), log: ['error'] });
    perBinding.set(db, client);
  }
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, key) {
    const client = resolve() as any;
    const v = client[key];
    return typeof v === 'function' ? v.bind(client) : v;
  },
});
