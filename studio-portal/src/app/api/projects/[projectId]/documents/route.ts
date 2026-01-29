import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { createDocumentUpdateUpdate } from "@/lib/projects/updates";

const createSchema = z.object({
  title: z.string().optional().nullable(),
  type: z.enum(["SCOPE", "SOW", "ARCHITECTURE", "DESIGN", "API", "LAUNCH_CHECKLIST", "HANDOFF", "NOTE", "DATABASE_ERD", "OTHER"]),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  versionLabel: z.string().optional().nullable(),
  clientVisible: z.boolean().optional(),
}).refine((data) => {
  // Title is required for all types except NOTE
  if (data.type !== "NOTE" && (!data.title || data.title.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Title is required for this document type",
  path: ["title"],
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const documents = await prisma.document.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
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

    // Provide default title for NOTE type if none provided
    const documentTitle = data.title?.trim() || (data.type === "NOTE" ? "Untitled Note" : null);
    
    const document = await prisma.document.create({
      data: {
        projectId: project.id,
        uploaderId: user.id,
        title: documentTitle,
        type: data.type,
        description: data.description || null,
        content: data.content || null,
        templateId: data.templateId || null,
        versionLabel: data.versionLabel || null,
        clientVisible: data.clientVisible || false,
      },
    });

    // Create project update for new document
    try {
      await createDocumentUpdateUpdate(project.id, document.title || "Untitled Note", true, user.id);
    } catch (error) {
      console.error("Error creating document update:", error);
      // Don't fail the request if update creation fails
    }

    return NextResponse.json({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      publishedAt: document.publishedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Create document error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

