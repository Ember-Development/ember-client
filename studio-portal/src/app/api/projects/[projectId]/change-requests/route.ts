import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { ChangeRequestType } from ".prisma/client";
import { estimateChangeRequestHours } from "@/lib/ai/estimation";
import { calculateTimelineImpact } from "@/lib/projects/timeline-impact";
import { createChangeRequestUpdate } from "@/lib/projects/updates";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.nativeEnum(ChangeRequestType),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Clients can only see their own change requests or all if they're admin
    const where: any = { projectId: project.id };
    if (user.userType === "CLIENT") {
      // Clients see their own change requests
      where.authorId = user.id;
    }

    const changeRequests = await prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(
      changeRequests.map((cr) => ({
        ...cr,
        createdAt: cr.createdAt.toISOString(),
        updatedAt: cr.updatedAt.toISOString(),
        newProjectDueDate: cr.newProjectDueDate?.toISOString() || null,
      }))
    );
  } catch (error) {
    console.error("Get change requests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch change requests" },
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

    const body = await request.json();
    const data = createSchema.parse(body);

    // Check weekly limit for clients (1 per week)
    if (user.userType === "CLIENT") {
      // Calculate start of current week (Monday at 00:00:00)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get to Monday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      // Check for existing change requests this week
      const existingRequestsThisWeek = await prisma.changeRequest.count({
        where: {
          projectId: project.id,
          authorId: user.id,
          createdAt: {
            gte: startOfWeek,
          },
        },
      });

      if (existingRequestsThisWeek >= 1) {
        // Calculate when they can submit again (next Monday)
        const nextMonday = new Date(startOfWeek);
        nextMonday.setDate(startOfWeek.getDate() + 7);
        
        return NextResponse.json(
          {
            error: "You have already submitted a change request this week. You can submit another one starting " +
              nextMonday.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }) + ".",
          },
          { status: 429 } // 429 Too Many Requests
        );
      }
    }

    // Get AI estimate
    let aiEstimatedHours: number | null = null;
    let estimatedTimelineDelayDays: number | null = null;
    let newProjectDueDate: Date | null = null;

    try {
      aiEstimatedHours = await estimateChangeRequestHours(
        data.title,
        data.description,
        data.type
      );

      // Calculate timeline impact
      const impact = calculateTimelineImpact(aiEstimatedHours, project);
      estimatedTimelineDelayDays = impact.delayDays;
      newProjectDueDate = impact.newDueDate;
    } catch (error) {
      console.error("Error estimating change request:", error);
      // Continue without estimates - they can be added manually
    }

    // Create change request
    const changeRequest = await prisma.changeRequest.create({
      data: {
        projectId: project.id,
        authorId: user.id,
        title: data.title,
        description: data.description,
        type: data.type,
        aiEstimatedHours,
        estimatedTimelineDelayDays,
        newProjectDueDate,
        status: "NEW",
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

    // Create project update notification
    try {
      await createChangeRequestUpdate(
        project.id,
        changeRequest.title,
        user.id,
        aiEstimatedHours,
        estimatedTimelineDelayDays,
        false
      );
    } catch (error) {
      console.error("Error creating change request update:", error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      ...changeRequest,
      createdAt: changeRequest.createdAt.toISOString(),
      updatedAt: changeRequest.updatedAt.toISOString(),
      newProjectDueDate: changeRequest.newProjectDueDate?.toISOString() || null,
    });
  } catch (error) {
    console.error("Create change request error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create change request" },
      { status: 500 }
    );
  }
}
