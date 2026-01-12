import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const now = new Date();

    // Find sprint where current date is between start and end dates
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        projectId: project.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        deliverables: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    if (!activeSprint) {
      return NextResponse.json({ sprint: null });
    }

    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const totalDeliverables = activeSprint.deliverables.length;
    const completedDeliverables = activeSprint.deliverables.filter(
      (d) => d.status === "DONE"
    ).length;
    const itemsProgress =
      totalDeliverables > 0
        ? Math.round((completedDeliverables / totalDeliverables) * 100)
        : 0;

    // Calculate days remaining
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      sprint: {
        ...activeSprint,
        startDate: activeSprint.startDate.toISOString(),
        endDate: activeSprint.endDate.toISOString(),
        timeProgress: Math.round(timeProgress),
        itemsProgress,
        totalDeliverables,
        completedDeliverables,
        daysRemaining: Math.max(0, daysRemaining),
      },
    });
  } catch (error) {
    console.error("Get active sprint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active sprint" },
      { status: 500 }
    );
  }
}

