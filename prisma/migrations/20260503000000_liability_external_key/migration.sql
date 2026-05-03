-- AlterTable
ALTER TABLE "LiabilityAccount" ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "externalProvider" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LiabilityAccount_externalKey_key" ON "LiabilityAccount"("externalKey");

-- CreateIndex
CREATE INDEX "LiabilityAccount_externalProvider_idx" ON "LiabilityAccount"("externalProvider");
