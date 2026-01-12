import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType, ChangeRequestStatus } from ".prisma/client";
import { z } from "zod";
import { calculateTimelineImpact } from "@/lib/projects/timeline-impact";
import { createChangeRequestUpdate, createProjectUpdate } from "@/lib/projects/updates";

const updateSchema = z.object({
  estimateHours: z.number().positive().optional().nullable(),
  estimateCostCents: z.number().int().min(0).optional().nullable(),
  status: z.nativeEnum(ChangeRequestStatus).optional(),
  scope: z.enum(["IN_SCOPE", "OUT_OF_SCOPE", "UNKNOWN"]).optional(),
  priority: z.enum(["LOW", "MED", "HIGH", "URGENT"]).optional(),
  impactNotes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; changeRequestId: string }> }
) {
  try {
    const { projectId, changeRequestId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const changeRequest = await prisma.changeRequest.findFirst({
      where: {
        id: changeRequestId,
        projectId: project.id,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Change request not found" },
        { status: 404 }
      );
    }

    // Clients can only see their own change requests
    if (user.userType === "CLIENT" && changeRequest.authorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      ...changeRequest,
      createdAt: changeRequest.createdAt.toISOString(),
      updatedAt: changeRequest.updatedAt.toISOString(),
      newProjectDueDate: changeRequest.newProjectDueDate?.toISOString() || null,
    });
  } catch (error) {
    console.error("Get change request error:", error);
    return NextResponse.json(
      { error: "Failed to fetch change request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; changeRequestId: string }> }
) {
  try {
    const { projectId, changeRequestId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can update change requests
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    // Get current change request
    const currentChangeRequest = await prisma.changeRequest.findFirst({
      where: {
        id: changeRequestId,
        projectId: project.id,
      },
    });

    if (!currentChangeRequest) {
      return NextResponse.json(
        { error: "Change request not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (data.estimateHours !== undefined) updateData.estimateHours = data.estimateHours;
    if (data.estimateCostCents !== undefined) updateData.estimateCostCents = data.estimateCostCents;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.impactNotes !== undefined) updateData.impactNotes = data.impactNotes;

    // If estimateHours is updated, recalculate timeline impact
    if (data.estimateHours !== undefined && data.estimateHours !== null) {
      const impact = calculateTimelineImpact(data.estimateHours, project);
      updateData.estimatedTimelineDelayDays = impact.delayDays;
      updateData.newProjectDueDate = impact.newDueDate;
    }

    const changeRequest = await prisma.changeRequest.update({
      where: { id: changeRequestId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // If status changed to APPROVED, update project due date
    if (data.status === "APPROVED" && changeRequest.newProjectDueDate) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          dueDate: changeRequest.newProjectDueDate,
        },
      });

      // Create project update
      try {
        await createChangeRequestUpdate(
          project.id,
          changeRequest.title,
          user.id,
          changeRequest.estimateHours || changeRequest.aiEstimatedHours,
          changeRequest.estimatedTimelineDelayDays,
          true
        );
      } catch (error) {
        console.error("Error creating approval update:", error);
      }
    }

    // Create update if status changed (but not for approval, which is handled above)
    if (data.status && data.status !== currentChangeRequest.status && data.status !== "APPROVED") {
      try {
        await createProjectUpdate({
          projectId: project.id,
          authorId: user.id,
          type: "GENERAL",
          title: "Change Request Status Updated",
          body: `Change request **${changeRequest.title}** status changed to **${data.status}**.`,
          clientVisible: true,
        });
      } catch (error) {
        console.error("Error creating status update:", error);
      }
    }

    return NextResponse.json({
      ...changeRequest,
      createdAt: changeRequest.createdAt.toISOString(),
      updatedAt: changeRequest.updatedAt.toISOString(),
      newProjectDueDate: changeRequest.newProjectDueDate?.toISOString() || null,
    });
  } catch (error) {
    console.error("Update change request error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update change request" },
      { status: 500 }
    );
  }
}
