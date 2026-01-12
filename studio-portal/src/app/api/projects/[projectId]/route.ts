import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { ProjectPhase, PricingModel } from ".prisma/client";
import { createPhaseChangeUpdate } from "@/lib/projects/updates";
import { createPhaseMilestone } from "@/lib/projects/milestones";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    return NextResponse.json({
      project: {
        ...project,
        startDate: project.startDate?.toISOString() || null,
        targetLaunchDate: project.targetLaunchDate?.toISOString() || null,
        dueDate: project.dueDate.toISOString(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: "Failed to get project" },
      { status: 500 }
    );
  }
}

const updateProjectSchema = z.object({
  phase: z.nativeEnum(ProjectPhase).optional(),
  status: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetLaunchDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional(),
  pricingModel: z.nativeEnum(PricingModel).optional().nullable(),
  weeklyCapacityHours: z.number().int().positive().optional().nullable(),
  hourlyRateCents: z.number().int().positive().optional().nullable(),
  fixedPriceCents: z.number().int().positive().optional().nullable(),
  retainerAmountCents: z.number().int().positive().optional().nullable(),
  retainerFrequency: z.string().optional().nullable(),
  pricingNotes: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user } = await requireProjectAccess(projectId);

    // Only internal users can update projects
    if (user.userType !== "INTERNAL") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Get current project to check for phase change
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { phase: true },
    });

    // Convert date strings to Date objects if provided
    const updateData: any = { ...validatedData };
    if (validatedData.startDate !== undefined) {
      updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    }
    if (validatedData.targetLaunchDate !== undefined) {
      updateData.targetLaunchDate = validatedData.targetLaunchDate
        ? new Date(validatedData.targetLaunchDate)
        : null;
    }
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    // If phase changed, create milestone and project update
    if (validatedData.phase && currentProject && currentProject.phase !== validatedData.phase) {
      try {
        await Promise.all([
          createPhaseMilestone(projectId, validatedData.phase),
          createPhaseChangeUpdate(projectId, currentProject.phase, validatedData.phase, user.id),
        ]);
      } catch (error) {
        console.error("Error creating phase milestone/update:", error);
        // Don't fail the request if milestone/update creation fails
      }
    }

    return NextResponse.json({
      project: {
        ...updatedProject,
        startDate: updatedProject.startDate?.toISOString() || null,
        targetLaunchDate: updatedProject.targetLaunchDate?.toISOString() || null,
        dueDate: updatedProject.dueDate.toISOString(),
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Update project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

