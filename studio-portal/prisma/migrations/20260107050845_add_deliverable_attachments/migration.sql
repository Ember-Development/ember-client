-- CreateTable
CREATE TABLE "DeliverableAttachment" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "fileName" TEXT NOT NULL,
    "fileMimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableAttachment_deliverableId_idx" ON "DeliverableAttachment"("deliverableId");

-- AddForeignKey
ALTER TABLE "DeliverableAttachment" ADD CONSTRAINT "DeliverableAttachment_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableAttachment" ADD CONSTRAINT "DeliverableAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
