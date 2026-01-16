import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Clients can only see tasks for client-visible deliverables
    if (user.userType === "CLIENT" && !deliverable.clientVisible) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tasks = await prisma.deliverableTask.findMany({
      where: { deliverableId: deliverable.id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        completedAt: t.completedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can create tasks
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title } = createTaskSchema.parse(body);

    // Get max orderIndex for this deliverable
    const maxOrder = await prisma.deliverableTask.aggregate({
      where: { deliverableId: deliverable.id },
      _max: { orderIndex: true },
    });

    const task = await prisma.deliverableTask.create({
      data: {
        deliverableId: deliverable.id,
        title,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });

    return NextResponse.json({
      task: {
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        completedAt: task.completedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

