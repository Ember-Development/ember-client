import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { generateReleaseNotesForSprint } from "@/lib/projects/release-notes";
import { createPhaseMilestone } from "@/lib/projects/milestones";

/**
 * This endpoint checks for completed sprints and generates release notes.
 * Should be called periodically (e.g., via cron job or scheduled task).
 * Can also be called manually to check for sprint completions.
 */
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

    const now = new Date();

    // Find sprints that have ended but don't have release notes yet
    // We'll check sprints that ended in the last 7 days to catch any we might have missed
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedSprints = await prisma.sprint.findMany({
      where: {
        projectId: project.id,
        endDate: {
          lte: now,
          gte: sevenDaysAgo,
        },
      },
      include: {
        deliverables: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const results = [];

    for (const sprint of completedSprints) {
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

      if (existingReleaseNotes) {
        continue; // Skip if release notes already exist
      }

      try {
        // Generate release notes
        const releaseNotes = await generateReleaseNotesForSprint(
          sprint.id,
          project.id,
          user.id
        );

        // Create milestone for sprint completion
        try {
          await createPhaseMilestone(project.id, project.phase);
        } catch (error) {
          console.error("Error creating sprint milestone:", error);
        }

        results.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          releaseNotesId: releaseNotes.id,
          success: true,
        });
      } catch (error) {
        console.error(`Error generating release notes for sprint ${sprint.id}:`, error);
        results.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      checked: completedSprints.length,
      processed: results.filter((r) => r.success).length,
      results,
    });
  } catch (error) {
    console.error("Check sprint completion error:", error);
    return NextResponse.json(
      { error: "Failed to check sprint completion" },
      { status: 500 }
    );
  }
}

