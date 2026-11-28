-- The n8n / draft-table outreach system was removed. Cold emails are now generated on demand and never stored.
DROP INDEX IF EXISTS "ColdEmailDraft_status_createdAt_idx";
DROP TABLE IF EXISTS "ColdEmailDraft";
