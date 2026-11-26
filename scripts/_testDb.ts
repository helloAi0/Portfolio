/** Import FIRST in tests that need a real database: points Prisma at prisma/test.db (built by _applyMigrations.mjs). */
process.env.DATABASE_URL = 'file:./test.db';
require('./_nodeDb');
export {};
