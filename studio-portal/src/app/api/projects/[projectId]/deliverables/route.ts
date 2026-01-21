import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["BACKLOG", "PLANNED", "IN_PROGRESS", "QA", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["LOW", "MED", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().nullable().optional(),
  estimateDays: z.number().int().min(0).nullable().optional(),
  sprintId: z.string().nullable().optional(),
  epicId: z.string().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);
    
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const maxOrder = await prisma.deliverable.findFirst({
      where: { projectId: project.id, status: data.status || "BACKLOG" },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const deliverable = await prisma.deliverable.create({
      data: {
        projectId: project.id,
        title: data.title,
        description: data.description || null,
        status: data.status || "BACKLOG",
        priority: data.priority || "MED",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId || null,
        estimateDays: data.estimateDays || null,
        sprintId: data.sprintId || null,
        epicId: data.epicId || null,
        clientVisible: true, // Default to visible for clients
        orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
      },
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
        epic: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Convert Date to ISO string for JSON response
    return NextResponse.json({
      ...deliverable,
      dueDate: deliverable.dueDate?.toISOString() || null,
      assignee: deliverable.assignee,
      sprint: deliverable.sprint,
      epic: deliverable.epic,
    });
  } catch (error) {
    console.error("Create deliverable error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    );
  }
}

