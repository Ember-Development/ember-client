import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType, MilestoneStatus } from ".prisma/client";
import { z } from "zod";

const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
  dueDate: z.string().optional(),
  requiresClientApproval: z.boolean().optional(),
  assignedToId: z.string().optional(),
  clientVisible: z.boolean().optional(),
  orderIndex: z.number().optional(),
});

// Calculate progress for a milestone
async function calculateMilestoneProgress(milestoneId: string): Promise<number | null> {
  const deliverables = await prisma.deliverable.findMany({
    where: { milestoneId },
  });

  if (deliverables.length === 0) {
    return null;
  }

  const completed = deliverables.filter((d) => d.status === "DONE").length;
  return Math.round((completed / deliverables.length) * 100);
}

// GET - List all milestones with progress
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const milestones = await prisma.milestone.findMany({
      where: {
        projectId: project.id,
        ...(user.userType === UserType.CLIENT ? { clientVisible: true } : {}),
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        ...(user.userType === UserType.INTERNAL
          ? {
              assignedTo: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            }
          : {}),
      },
    });

    // Calculate progress for each milestone
    const milestonesWithProgress = await Promise.all(
      milestones.map(async (milestone) => {
        const progress = await calculateMilestoneProgress(milestone.id);
        const deliverables = await prisma.deliverable.findMany({
          where: { milestoneId: milestone.id },
        });

        return {
          ...milestone,
          progress,
          deliverablesCount: deliverables.length,
          completedDeliverablesCount: deliverables.filter((d) => d.status === "DONE").length,
          createdAt: milestone.createdAt.toISOString(),
          updatedAt: milestone.updatedAt.toISOString(),
          dueDate: milestone.dueDate?.toISOString() || null,
          completedAt: milestone.completedAt?.toISOString() || null,
        };
      })
    );

    return NextResponse.json(milestonesWithProgress);
  } catch (error) {
    console.error("Get milestones error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

// POST - Create new milestone
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can create milestones
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createMilestoneSchema.parse(body);

    // Get max orderIndex to append at end
    const maxOrder = await prisma.milestone.findFirst({
      where: { projectId: project.id },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const milestone = await prisma.milestone.create({
      data: {
        projectId: project.id,
        title: data.title,
        description: data.description,
        status: data.status || MilestoneStatus.NOT_STARTED,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        requiresClientApproval: data.requiresClientApproval || false,
        assignedToId: data.assignedToId || null,
        clientVisible: data.clientVisible !== undefined ? data.clientVisible : true,
        orderIndex: data.orderIndex !== undefined ? data.orderIndex : (maxOrder?.orderIndex ?? -1) + 1,
        approvalStatus: data.requiresClientApproval ? "PENDING" : null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const progress = await calculateMilestoneProgress(milestone.id);

    return NextResponse.json({
      ...milestone,
      progress,
      deliverablesCount: 0,
      completedDeliverablesCount: 0,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
      dueDate: milestone.dueDate?.toISOString() || null,
      completedAt: milestone.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Create milestone error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}

