import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole } from ".prisma/client";
import { z } from "zod";

const addProjectSchema = z.object({
  projectId: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireInternalUser();
    const { userId } = await params;

    // Only admins and owners can manage user projects
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { projectId } = addProjectSchema.parse(body);

    // Verify user exists and belongs to the same tenant
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify project exists and belongs to the same tenant
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if membership already exists
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 }
      );
    }

    // Add user to project
    await prisma.projectMember.create({
      data: {
        projectId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add user to project error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add user to project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireInternalUser();
    const { userId } = await params;

    // Only admins and owners can manage user projects
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify user exists and belongs to the same tenant
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find and delete the membership
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not a member of this project" },
        { status: 404 }
      );
    }

    await prisma.projectMember.delete({
      where: { id: membership.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove user from project error:", error);
    return NextResponse.json(
      { error: "Failed to remove user from project" },
      { status: 500 }
    );
  }
}

