import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string; taskId: string }> }
) {
  try {
    const { projectId, deliverableId, taskId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can update tasks
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const task = await prisma.deliverableTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.deliverableId !== deliverable.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }

    const updated = await prisma.deliverableTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      task: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        completedAt: updated.completedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string; taskId: string }> }
) {
  try {
    const { projectId, deliverableId, taskId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can delete tasks
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const task = await prisma.deliverableTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.deliverableId !== deliverable.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.deliverableTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

