-- CreateEnum
CREATE TYPE "EpicStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "epicId" TEXT;

-- AlterTable
ALTER TABLE "DeliverableTask" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "estimateHours" DOUBLE PRECISION,
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "status" "DeliverableTaskStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "Epic" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EpicStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "Priority" NOT NULL DEFAULT 'MED',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Epic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Epic_projectId_status_orderIndex_idx" ON "Epic"("projectId", "status", "orderIndex");

-- CreateIndex
CREATE INDEX "Epic_assigneeId_idx" ON "Epic"("assigneeId");

-- CreateIndex
CREATE INDEX "Deliverable_epicId_idx" ON "Deliverable"("epicId");

-- CreateIndex
CREATE INDEX "DeliverableTask_assigneeId_idx" ON "DeliverableTask"("assigneeId");

-- AddForeignKey
ALTER TABLE "Epic" ADD CONSTRAINT "Epic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Epic" ADD CONSTRAINT "Epic_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableTask" ADD CONSTRAINT "DeliverableTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
