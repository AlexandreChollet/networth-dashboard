-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PEA', 'AV', 'LIVRET', 'PER', 'CRYPTO', 'IMMO', 'CASH', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "institution" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Balance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoHolding" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "coingeckoId" TEXT NOT NULL,
    "quantity" DECIMAL(28,10) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiabilityAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remainingBalance" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "LiabilityAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Balance_accountId_date_idx" ON "Balance"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoHolding_coingeckoId_key" ON "CryptoHolding"("coingeckoId");

-- CreateIndex
CREATE INDEX "LiabilityAccount_date_idx" ON "LiabilityAccount"("date");

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
