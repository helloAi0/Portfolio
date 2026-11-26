-- Certificate ingestion pipeline: review fields on Certificate + the email queue.
ALTER TABLE "Certificate" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "Certificate" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Certificate" ADD COLUMN "sourceMessageId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "confidenceScore" REAL;
ALTER TABLE "Certificate" ADD COLUMN "needsUrlReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Certificate" ADD COLUMN "reviewedAt" DATETIME;
CREATE INDEX "Certificate_reviewStatus_idx" ON "Certificate"("reviewStatus");

-- CreateTable
CREATE TABLE "EmailIngestQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "rawText" TEXT NOT NULL,
    "extractedLinks" TEXT NOT NULL DEFAULT '[]',
    "hasPdf" BOOLEAN NOT NULL DEFAULT false,
    "pdfFileId" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'queued',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailIngestQueue_messageId_key" ON "EmailIngestQueue"("messageId");
CREATE INDEX "EmailIngestQueue_processingStatus_createdAt_idx" ON "EmailIngestQueue"("processingStatus", "createdAt");
