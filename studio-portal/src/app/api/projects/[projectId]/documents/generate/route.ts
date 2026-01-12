import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { generateDocumentFromTemplate } from "@/lib/documents/template-engine";
import { getTemplateById } from "@/lib/documents/templates";
import { z } from "zod";
import { marked } from "marked";

const generateSchema = z.object({
  templateId: z.string(),
  title: z.string().optional(),
});

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

    if (!project.client) {
      console.error("Project client not loaded:", project);
      return NextResponse.json(
        { error: "Project client data not available" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { templateId, title } = generateSchema.parse(body);

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Generate content from template
    const markdownContent = generateDocumentFromTemplate(templateId, {
      name: project.name,
      client: { name: project.client.name },
      startDate: project.startDate,
      targetLaunchDate: project.targetLaunchDate,
      description: project.description,
      phase: project.phase,
      status: project.status,
    });

    // Convert markdown to HTML for rich text editor (except for ARCHITECTURE and API types)
    const content: string = template.type === "ARCHITECTURE" || template.type === "API"
      ? markdownContent
      : marked.parse(markdownContent) as string;

    // Create document
    const document = await prisma.document.create({
      data: {
        projectId: project.id,
        uploaderId: user.id,
        title: title || template.name,
        type: template.type,
        description: `Generated from ${template.name} template`,
        content: content,
        templateId: templateId,
        clientVisible: false,
      },
    });

    return NextResponse.json({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      publishedAt: document.publishedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Generate document error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate document";
    console.error("Error details:", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

