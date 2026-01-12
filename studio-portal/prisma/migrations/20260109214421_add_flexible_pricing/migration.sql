-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('HOURLY', 'FIXED_PRICE', 'RETAINER', 'MILESTONE_BASED', 'TBD');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "fixedPriceCents" INTEGER,
ADD COLUMN     "pricingModel" "PricingModel",
ADD COLUMN     "pricingNotes" TEXT,
ADD COLUMN     "retainerAmountCents" INTEGER,
ADD COLUMN     "retainerFrequency" TEXT;

-- Set default for existing projects
UPDATE "Project" SET "pricingModel" = 'TBD' WHERE "pricingModel" IS NULL;

-- Set default for future projects
ALTER TABLE "Project" ALTER COLUMN "pricingModel" SET DEFAULT 'TBD';
