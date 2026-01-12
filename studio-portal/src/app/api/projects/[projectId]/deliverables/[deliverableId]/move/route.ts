import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType, DeliverableStatus } from ".prisma/client";
import { z } from "zod";
import { createDeliverableStatusUpdate } from "@/lib/projects/updates";

const moveSchema = z.object({
  status: z.enum(["BACKLOG", "PLANNED", "IN_PROGRESS", "QA", "BLOCKED", "DONE"]),
  orderIndex: z.number().int().min(0),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);
    
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { status, orderIndex } = moveSchema.parse(body);

    // Get current deliverable to check for status change
    const currentDeliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
      select: { status: true, title: true },
    });

    const deliverable = await prisma.deliverable.update({
      where: { id: deliverableId, projectId: project.id },
      data: { 
        status: status as DeliverableStatus, 
        orderIndex 
      },
    });

    // If status changed, create project update
    if (currentDeliverable && currentDeliverable.status !== status) {
      try {
        await createDeliverableStatusUpdate(
          projectId,
          deliverable.title,
          currentDeliverable.status,
          status,
          user.id
        );
      } catch (error) {
        console.error("Error creating deliverable status update:", error);
        // Don't fail the request if update creation fails
      }
    }

    return NextResponse.json(deliverable);
  } catch (error) {
    console.error("Move deliverable error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to move deliverable" },
      { status: 500 }
    );
  }
}

