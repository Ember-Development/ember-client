import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { DeliverableTaskStatus, Priority } from ".prisma/client";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(DeliverableTaskStatus).optional(),
  completed: z.boolean().optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().optional().nullable(),
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
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Sync completed field with status
      updateData.completed = data.status === DeliverableTaskStatus.DONE;
      updateData.completedAt = data.status === DeliverableTaskStatus.DONE ? new Date() : null;
    }
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
      // Sync status with completed
      if (data.completed) {
        updateData.status = DeliverableTaskStatus.DONE;
      } else if (updateData.status === undefined) {
        // Only update status if it's currently DONE and we're uncompleting
        const currentTask = await prisma.deliverableTask.findUnique({ where: { id: taskId } });
        if (currentTask?.status === DeliverableTaskStatus.DONE) {
          updateData.status = DeliverableTaskStatus.NOT_STARTED;
        }
      }
    }
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.estimateHours !== undefined) updateData.estimateHours = data.estimateHours;

    const updated = await prisma.deliverableTask.update({
      where: { id: taskId },
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
      task: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        completedAt: updated.completedAt?.toISOString() || null,
        dueDate: updated.dueDate?.toISOString() || null,
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

