import { NextResponse } from 'next/server';
/** Turns "no such table/column" (a database that has not had the latest migrations) into an instruction the owner can follow. */
export function dbFailure(e: unknown, area: string) {
  const msg = e instanceof Error ? e.message : String(e);
  const stale = /no such (table|column)|does not exist in the current database|The table .* does not exist|The column .* does not exist/i.test(msg);
  return NextResponse.json({
    error: stale
      ? `${area}: the database is missing the latest update. Locally run "npm run db:local:init" and restart; on Cloudflare run "npx wrangler d1 migrations apply <your-db> --remote".`
      : `${area} could not be loaded.`,
  }, { status: 500 });
}
