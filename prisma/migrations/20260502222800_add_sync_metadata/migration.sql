-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'OK', 'AUTH_FAILED', 'SCA_REQUIRED', 'ERROR');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "externalProvider" TEXT;

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "accountsSynced" INTEGER NOT NULL DEFAULT 0,
    "detected" TEXT,
    "errorCode" TEXT,
    "message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_externalKey_key" ON "Account"("externalKey");

-- CreateIndex
CREATE INDEX "Account_externalProvider_idx" ON "Account"("externalProvider");

-- CreateIndex
CREATE INDEX "SyncLog_provider_startedAt_idx" ON "SyncLog"("provider", "startedAt");
