import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { EpicStatus, Priority } from ".prisma/client";

const createEpicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(EpicStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  clientVisible: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const epics = await prisma.epic.findMany({
      where: { projectId: project.id },
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
            status: true,
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      epics: epics.map((epic) => ({
        ...epic,
        createdAt: epic.createdAt.toISOString(),
        updatedAt: epic.updatedAt.toISOString(),
        dueDate: epic.dueDate?.toISOString() || null,
        deliverableCount: epic.deliverables.length,
      })),
    });
  } catch (error) {
    console.error("Get epics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch epics" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can create epics
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createEpicSchema.parse(body);

    // Get max orderIndex for this project
    const maxOrder = await prisma.epic.aggregate({
      where: { projectId: project.id },
      _max: { orderIndex: true },
    });

    const epic = await prisma.epic.create({
      data: {
        projectId: project.id,
        title: data.title,
        description: data.description || null,
        status: data.status || EpicStatus.NOT_STARTED,
        priority: data.priority || Priority.MED,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        clientVisible: data.clientVisible ?? true,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
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
      },
    });

    return NextResponse.json({
      epic: {
        ...epic,
        createdAt: epic.createdAt.toISOString(),
        updatedAt: epic.updatedAt.toISOString(),
        dueDate: epic.dueDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Create epic error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create epic" },
      { status: 500 }
    );
  }
}

