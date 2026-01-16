-- CreateTable
CREATE TABLE "DeliverableTask" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableTask_deliverableId_orderIndex_idx" ON "DeliverableTask"("deliverableId", "orderIndex");

-- AddForeignKey
ALTER TABLE "DeliverableTask" ADD CONSTRAINT "DeliverableTask_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
