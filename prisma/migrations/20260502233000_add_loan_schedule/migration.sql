-- CreateTable
CREATE TABLE "LoanSchedule" (
    "id" TEXT NOT NULL,
    "liabilityAccountId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "capitalBefore" DECIMAL(14,2) NOT NULL,
    "principalPayment" DECIMAL(14,2) NOT NULL,
    "interestPayment" DECIMAL(14,2) NOT NULL,
    "insurancePayment" DECIMAL(14,2),
    "totalPayment" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LoanSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanSchedule_liabilityAccountId_dueDate_key" ON "LoanSchedule"("liabilityAccountId", "dueDate");

-- CreateIndex
CREATE INDEX "LoanSchedule_liabilityAccountId_dueDate_idx" ON "LoanSchedule"("liabilityAccountId", "dueDate");

-- AddForeignKey
ALTER TABLE "LoanSchedule" ADD CONSTRAINT "LoanSchedule_liabilityAccountId_fkey" FOREIGN KEY ("liabilityAccountId") REFERENCES "LiabilityAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
