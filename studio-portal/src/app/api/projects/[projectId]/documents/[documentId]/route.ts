import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createDocumentUpdateUpdate } from "@/lib/projects/updates";

const updateSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  versionLabel: z.string().optional().nullable(),
  clientVisible: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  try {
    const { projectId, documentId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const where: any = {
      id: documentId,
      projectId: project.id,
    };

    // Clients can only see client-visible documents
    if (user.userType === UserType.CLIENT) {
      where.clientVisible = true;
    }

    const document = await prisma.document.findFirst({
      where,
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      publishedAt: document.publishedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Failed to get document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  try {
    const { projectId, documentId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    // Get the current document to check its type
    const currentDocument = await prisma.document.findFirst({
      where: { id: documentId, projectId: project.id },
      select: { type: true },
    });

    if (!currentDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Validate title: required for all types except NOTE
    if (data.title !== undefined) {
      const trimmedTitle = data.title?.trim() || null;
      if (currentDocument.type !== "NOTE" && (!trimmedTitle || trimmedTitle.length === 0)) {
        return NextResponse.json(
          { error: "Title is required for this document type" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) {
      // For NOTE type, allow null/empty; for others, use provided title or keep existing
      if (currentDocument.type === "NOTE") {
        updateData.title = data.title?.trim() || null;
      } else {
        updateData.title = data.title?.trim() || null;
      }
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.versionLabel !== undefined) updateData.versionLabel = data.versionLabel;
    if (data.clientVisible !== undefined) updateData.clientVisible = data.clientVisible;

    const document = await prisma.document.update({
      where: { id: documentId, projectId: project.id },
      data: updateData,
    });

    // Create project update for document update (only if content or title changed)
    if (data.title !== undefined || data.content !== undefined) {
      try {
        await createDocumentUpdateUpdate(project.id, document.title || "Untitled Note", false, user.id);
      } catch (error) {
        console.error("Error creating document update:", error);
        // Don't fail the request if update creation fails
      }
    }

    return NextResponse.json({
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      publishedAt: document.publishedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Update document error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  try {
    const { projectId, documentId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id: documentId, projectId: project.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

