-- CreateTable
CREATE TABLE "JobMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "country" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "why" TEXT NOT NULL DEFAULT '[]',
    "letter" TEXT NOT NULL,
    "letterNeeded" BOOLEAN NOT NULL DEFAULT false,
    "todo" TEXT NOT NULL DEFAULT '[]',
    "ratingNote" TEXT,
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobKv" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "JobMatch_externalId_key" ON "JobMatch"("externalId");

-- CreateIndex
CREATE INDEX "JobMatch_status_createdAt_idx" ON "JobMatch"("status", "createdAt");
