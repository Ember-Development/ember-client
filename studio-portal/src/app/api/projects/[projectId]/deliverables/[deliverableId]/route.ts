import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { createDeliverableStatusUpdate } from "@/lib/projects/updates";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG", "PLANNED", "IN_PROGRESS", "QA", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["LOW", "MED", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().nullable().optional(),
  estimateDays: z.number().int().min(0).nullable().optional(),
  sprintId: z.string().nullable().optional(),
  clientVisible: z.boolean().optional(),
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
    const data = updateSchema.parse(body);

    // Get current deliverable to check for status change
    const currentDeliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
      select: { status: true, title: true },
    });

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.estimateDays !== undefined) updateData.estimateDays = data.estimateDays;
    if (data.sprintId !== undefined) updateData.sprintId = data.sprintId;
    if (data.clientVisible !== undefined) updateData.clientVisible = data.clientVisible;

    const deliverable = await prisma.deliverable.update({
      where: { id: deliverableId, projectId: project.id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sprint: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If status changed, create project update
    if (
      data.status !== undefined &&
      currentDeliverable &&
      currentDeliverable.status !== data.status
    ) {
      try {
        await createDeliverableStatusUpdate(
          projectId,
          deliverable.title,
          currentDeliverable.status,
          data.status,
          user.id
        );
      } catch (error) {
        console.error("Error creating deliverable status update:", error);
        // Don't fail the request if update creation fails
      }
    }

    return NextResponse.json({
      ...deliverable,
      dueDate: deliverable.dueDate?.toISOString() || null,
      assignee: deliverable.assignee,
      sprint: deliverable.sprint,
    });
  } catch (error) {
    console.error("Update deliverable error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);
    
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.deliverable.delete({
      where: { id: deliverableId, projectId: project.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete deliverable error:", error);
    return NextResponse.json(
      { error: "Failed to delete deliverable" },
      { status: 500 }
    );
  }
}

