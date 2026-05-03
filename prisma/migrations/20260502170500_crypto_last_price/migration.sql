-- AlterTable
ALTER TABLE "CryptoHolding"
  ADD COLUMN "lastPriceEUR" DECIMAL(20,8),
  ADD COLUMN "lastPriceFetchedAt" TIMESTAMP(3);
