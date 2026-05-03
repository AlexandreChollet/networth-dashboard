-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('PEA', 'AV', 'LIVRET', 'PER', 'CRYPTO', 'CASH', 'OTHER');
ALTER TABLE "Account" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
COMMIT;
