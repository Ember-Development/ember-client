-- Update existing deliverables to be client-visible
UPDATE "Deliverable" SET "clientVisible" = true WHERE "clientVisible" = false;

-- AlterTable
ALTER TABLE "Deliverable" ALTER COLUMN "clientVisible" SET DEFAULT true;
