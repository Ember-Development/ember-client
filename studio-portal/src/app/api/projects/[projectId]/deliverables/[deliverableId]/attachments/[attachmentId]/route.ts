import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string; attachmentId: string }> }
) {
  try {
    const { projectId, deliverableId, attachmentId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Verify attachment belongs to this deliverable
    const attachment = await prisma.deliverableAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.deliverableId !== deliverable.id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    await prisma.deliverableAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

