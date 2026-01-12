-- AlterTable: Add ChangeRequest fields
ALTER TABLE "ChangeRequest" ADD COLUMN     "aiEstimatedHours" DOUBLE PRECISION,
ADD COLUMN     "estimatedTimelineDelayDays" INTEGER,
ADD COLUMN     "newProjectDueDate" TIMESTAMP(3);

-- AlterTable: Add Project fields (dueDate as nullable first)
ALTER TABLE "Project" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "hourlyRateCents" INTEGER;

-- Update existing projects: set dueDate to targetLaunchDate if available, otherwise 90 days from now
UPDATE "Project" 
SET "dueDate" = COALESCE("targetLaunchDate", NOW() + INTERVAL '90 days')
WHERE "dueDate" IS NULL;

-- Now make dueDate required
ALTER TABLE "Project" ALTER COLUMN "dueDate" SET NOT NULL;

-- AddForeignKey: ChangeRequest author relation
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
