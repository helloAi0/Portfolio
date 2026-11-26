-- Job form pre-fill fields + Mode 3 cold email drafts.
ALTER TABLE "JobMatch" ADD COLUMN "atsPlatform" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "prefillStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "JobMatch" ADD COLUMN "formConfidence" REAL;
ALTER TABLE "JobMatch" ADD COLUMN "essayFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobMatch" ADD COLUMN "draftedAnswers" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "JobMatch" ADD COLUMN "screenshotUrl" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "prefillNote" TEXT;

-- CreateTable
CREATE TABLE "ColdEmailDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "companyOrLab" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "focus" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ColdEmailDraft_status_createdAt_idx" ON "ColdEmailDraft"("status", "createdAt");
