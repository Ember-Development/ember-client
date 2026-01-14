import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { supabase, ATTACHMENTS_BUCKET } from "@/lib/storage/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string; attachmentId: string }> }
) {
  try {
    const { projectId, deliverableId, attachmentId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Clients can only download attachments for client-visible deliverables
    if (user.userType === "CLIENT" && !deliverable.clientVisible) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const attachment = await prisma.deliverableAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.deliverableId !== deliverable.id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // If attachment has an externalUrl (public URL), redirect to it
    if (attachment.externalUrl) {
      return NextResponse.redirect(attachment.externalUrl);
    }

    // If attachment has a storageKey, generate a signed URL (for private buckets)
    if (attachment.storageKey) {
      const { data, error } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storageKey, 3600); // 1 hour expiry

      if (error || !data) {
        console.error("Failed to create signed URL:", error);
        return NextResponse.json(
          { error: "Failed to generate download link" },
          { status: 500 }
        );
      }

      return NextResponse.redirect(data.signedUrl);
    }

    return NextResponse.json(
      { error: "Attachment has no file associated" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Download attachment error:", error);
    return NextResponse.json(
      { error: "Failed to download attachment" },
      { status: 500 }
    );
  }
}

