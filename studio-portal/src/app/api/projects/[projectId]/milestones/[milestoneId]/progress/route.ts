import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";

// GET - Calculate milestone progress
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
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const deliverables = await prisma.deliverable.findMany({
      where: { milestoneId: milestone.id },
    });

    if (deliverables.length === 0) {
      return NextResponse.json({
        progress: null,
        total: 0,
        completed: 0,
      });
    }

    const completed = deliverables.filter((d) => d.status === "DONE").length;
    const progress = Math.round((completed / deliverables.length) * 100);

    return NextResponse.json({
      progress,
      total: deliverables.length,
      completed,
    });
  } catch (error) {
    console.error("Calculate progress error:", error);
    return NextResponse.json(
      { error: "Failed to calculate progress" },
      { status: 500 }
    );
  }
}

