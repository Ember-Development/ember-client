import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { generateReleaseNotesForSprint } from "@/lib/projects/release-notes";
import { createPhaseMilestone } from "@/lib/projects/milestones";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  try {
    const { projectId, sprintId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId: project.id },
      include: {
        deliverables: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const totalDeliverables = sprint.deliverables.length;
    const completedDeliverables = sprint.deliverables.filter(
      (d) => d.status === "DONE"
    ).length;
    const itemsProgress =
      totalDeliverables > 0
        ? Math.round((completedDeliverables / totalDeliverables) * 100)
        : 0;

    return NextResponse.json({
      ...sprint,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      totalDeliverables,
      completedDeliverables,
      itemsProgress,
    });
  } catch (error) {
    console.error("Get sprint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprint" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  try {
    const { projectId, sprintId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    
    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);
      updateData.startDate = startDate;
      updateData.endDate = endDate;

      // Check for overlapping sprints (excluding current sprint)
      const overlapping = await prisma.sprint.findFirst({
        where: {
          id: { not: sprintId },
          projectId: project.id,
          OR: [
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
            },
          ],
        },
      });

      if (overlapping) {
        return NextResponse.json(
          { error: "Sprint dates overlap with an existing sprint" },
          { status: 400 }
        );
      }
    }

    const sprint = await prisma.sprint.update({
      where: { id: sprintId, projectId: project.id },
      data: updateData,
    });

    // Check if sprint has just completed (endDate is in the past)
    const now = new Date();
    if (sprint.endDate <= now) {
      // Check if release notes already exist for this sprint
      const existingReleaseNotes = await prisma.projectUpdate.findFirst({
        where: {
          projectId: project.id,
          type: "LAUNCH",
          title: {
            contains: sprint.name,
          },
          body: {
            contains: "Sprint Completed",
          },
        },
      });

      if (!existingReleaseNotes) {
        try {
          // Generate release notes for completed sprint
          await generateReleaseNotesForSprint(sprint.id, project.id, user.id);
          // Create milestone for sprint completion
          await createPhaseMilestone(project.id, project.phase);
        } catch (error) {
          console.error("Error generating release notes for sprint:", error);
          // Don't fail the request if release note generation fails
        }
      }
    }

    return NextResponse.json({
      ...sprint,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
    });
  } catch (error) {
    console.error("Update sprint error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update sprint" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  try {
    const { projectId, sprintId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Unassign deliverables from this sprint before deleting
    await prisma.deliverable.updateMany({
      where: { sprintId, projectId: project.id },
      data: { sprintId: null },
    });

    await prisma.sprint.delete({
      where: { id: sprintId, projectId: project.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete sprint error:", error);
    return NextResponse.json(
      { error: "Failed to delete sprint" },
      { status: 500 }
    );
  }
}

