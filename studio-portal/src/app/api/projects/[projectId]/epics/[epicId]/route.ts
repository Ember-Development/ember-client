import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { EpicStatus, Priority } from ".prisma/client";

const updateEpicSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(EpicStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  clientVisible: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const { projectId, epicId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const epic = await prisma.epic.findUnique({
      where: { id: epicId, projectId: project.id },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        deliverables: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    return NextResponse.json({
      epic: {
        ...epic,
        createdAt: epic.createdAt.toISOString(),
        updatedAt: epic.updatedAt.toISOString(),
        dueDate: epic.dueDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Get epic error:", error);
    return NextResponse.json(
      { error: "Failed to fetch epic" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const { projectId, epicId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can update epics
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const epic = await prisma.epic.findUnique({
      where: { id: epicId, projectId: project.id },
    });

    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateEpicSchema.parse(body);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.clientVisible !== undefined) updateData.clientVisible = data.clientVisible;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;

    const updated = await prisma.epic.update({
      where: { id: epicId },
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
      },
    });

    return NextResponse.json({
      epic: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        dueDate: updated.dueDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Update epic error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update epic" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; epicId: string }> }
) {
  try {
    const { projectId, epicId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can delete epics
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const epic = await prisma.epic.findUnique({
      where: { id: epicId, projectId: project.id },
    });

    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    await prisma.epic.delete({
      where: { id: epicId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete epic error:", error);
    return NextResponse.json(
      { error: "Failed to delete epic" },
      { status: 500 }
    );
  }
}

