import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const sprints = await prisma.sprint.findMany({
      where: { projectId: project.id },
      orderBy: { startDate: "desc" },
      include: {
        deliverables: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Calculate progress for each sprint
    const sprintsWithProgress = sprints.map((sprint) => {
      const now = new Date();
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      
      const totalDeliverables = sprint.deliverables.length;
      const completedDeliverables = sprint.deliverables.filter(
        (d) => d.status === "DONE"
      ).length;

      // Time progress (0-100)
      let timeProgress = 0;
      if (now >= start && now <= end) {
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      } else if (now > end) {
        timeProgress = 100;
      }

      // Items progress (0-100)
      const itemsProgress =
        totalDeliverables > 0
          ? Math.round((completedDeliverables / totalDeliverables) * 100)
          : 0;

      return {
        ...sprint,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
        timeProgress,
        itemsProgress,
        totalDeliverables,
        completedDeliverables,
      };
    });

    return NextResponse.json(sprintsWithProgress);
  } catch (error) {
    console.error("Get sprints error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprints" },
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

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14); // 2 weeks

    // Check for overlapping sprints (optional validation)
    const overlapping = await prisma.sprint.findFirst({
      where: {
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

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: data.name,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({
      ...sprint,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
    });
  } catch (error) {
    console.error("Create sprint error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create sprint" },
      { status: 500 }
    );
  }
}

