-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "approvalNotes" TEXT,
ADD COLUMN     "approvalStatus" "ApprovalStatus",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "clientVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Milestone_projectId_orderIndex_idx" ON "Milestone"("projectId", "orderIndex");
