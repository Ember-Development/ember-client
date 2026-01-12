import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType, MilestoneStatus } from ".prisma/client";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(MilestoneStatus).optional(),
  dueDate: z.string().optional().nullable(),
  requiresClientApproval: z.boolean().optional(),
  assignedToId: z.string().optional().nullable(),
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

// GET - Get single milestone with related data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const { projectId, milestoneId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId: project.id,
        ...(user.userType === UserType.CLIENT ? { clientVisible: true } : {}),
      },
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

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const progress = await calculateMilestoneProgress(milestone.id);
    const deliverables = await prisma.deliverable.findMany({
      where: { milestoneId: milestone.id },
    });
    const changeRequests = await prisma.changeRequest.findMany({
      where: { scheduledForMilestoneId: milestone.id },
    });

    return NextResponse.json({
      ...milestone,
      progress,
      deliverablesCount: deliverables.length,
      completedDeliverablesCount: deliverables.filter((d) => d.status === "DONE").length,
      deliverables,
      changeRequests,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
      dueDate: milestone.dueDate?.toISOString() || null,
      completedAt: milestone.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Get milestone error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

// PUT - Update milestone
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const { projectId, milestoneId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can update milestones
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId: project.id },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // If status is being set to DONE, set completedAt
    const updateData: any = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      }),
      ...(data.requiresClientApproval !== undefined && {
        requiresClientApproval: data.requiresClientApproval,
      }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      ...(data.clientVisible !== undefined && { clientVisible: data.clientVisible }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
    };

    // Set completedAt when status changes to DONE
    if (data.status === MilestoneStatus.DONE && milestone.status !== MilestoneStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (data.status !== MilestoneStatus.DONE && milestone.status === MilestoneStatus.DONE) {
      updateData.completedAt = null;
    }

    // If requiresClientApproval changes, update approvalStatus
    if (data.requiresClientApproval === true && !milestone.requiresClientApproval) {
      updateData.approvalStatus = "PENDING";
    } else if (data.requiresClientApproval === false) {
      updateData.approvalStatus = null;
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
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

    const progress = await calculateMilestoneProgress(updated.id);
    const deliverables = await prisma.deliverable.findMany({
      where: { milestoneId: updated.id },
    });

    return NextResponse.json({
      ...updated,
      progress,
      deliverablesCount: deliverables.length,
      completedDeliverablesCount: deliverables.filter((d) => d.status === "DONE").length,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      dueDate: updated.dueDate?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Update milestone error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete milestone
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const { projectId, milestoneId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can delete milestones
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId: project.id },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete milestone error:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}

