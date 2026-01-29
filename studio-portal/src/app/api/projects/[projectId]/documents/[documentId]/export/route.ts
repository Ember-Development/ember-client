import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { exportDocumentToPDF } from "@/lib/documents/export";

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

    // Clients can only download client-visible documents
    if (user.userType === UserType.CLIENT) {
      where.clientVisible = true;
    }

    const document = await prisma.document.findFirst({
      where,
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf";

    // If document has a stored file, serve it directly
    if (document.storageKey && document.fileName) {
      // For now, if there's an external URL, redirect to it
      // In production, you'd fetch from your storage provider (S3, etc.)
      if (document.externalUrl) {
        return NextResponse.redirect(document.externalUrl);
      }
      
      // If you have a storage service, fetch the file here
      // For now, return an error if no external URL
      return NextResponse.json(
        { error: "File download not available. Please contact support." },
        { status: 501 }
      );
    }

    // Export document content to PDF
    if (format === "pdf") {
      const documentTitle = document.title || "Untitled Note";
      const pdfBuffer = await exportDocumentToPDF(
        documentTitle,
        document.content || ""
      );

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${documentTitle.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
        },
      });
    } else if (format === "docx") {
      // DOCX export would require additional library like 'docx'
      // For now, return a placeholder
      return NextResponse.json(
        { error: "DOCX export not yet implemented" },
        { status: 501 }
      );
    } else {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
  } catch (error) {
    console.error("Export document error:", error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}

