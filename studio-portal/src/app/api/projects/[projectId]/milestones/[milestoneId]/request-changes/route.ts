import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";

const requestChangesSchema = z.object({
  notes: z.string().min(1, "Notes are required when requesting changes"),
});

// POST - Client requests changes
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const { projectId, milestoneId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only clients can request changes
    if (user.userType !== UserType.CLIENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = requestChangesSchema.parse(body);

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId: project.id,
        clientVisible: true,
        requiresClientApproval: true,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        approvalStatus: "CHANGES_REQUESTED",
        approvalNotes: data.notes,
      },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      dueDate: updated.dueDate?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Request changes error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to request changes" },
      { status: 500 }
    );
  }
}

