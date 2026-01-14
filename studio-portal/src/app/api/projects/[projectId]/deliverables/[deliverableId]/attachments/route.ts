import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { supabase, ATTACHMENTS_BUCKET } from "@/lib/storage/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Clients can only see attachments for client-visible deliverables
    if (user.userType === UserType.CLIENT && !deliverable.clientVisible) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const attachments = await prisma.deliverableAttachment.findMany({
      where: { deliverableId: deliverable.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      attachments: attachments.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get attachments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique file path: projects/{projectId}/deliverables/{deliverableId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `projects/${project.id}/deliverables/${deliverable.id}/${timestamp}-${sanitizedFileName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    // Store attachment metadata in database
    const attachment = await prisma.deliverableAttachment.create({
      data: {
        deliverableId: deliverable.id,
        uploadedById: user.id,
        fileName: file.name,
        fileMimeType: file.type,
        fileSizeBytes: file.size,
        storageProvider: "supabase",
        storageKey: filePath,
        externalUrl: urlData.publicUrl,
      },
    });

    return NextResponse.json({
      attachment: {
        ...attachment,
        createdAt: attachment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Upload attachment error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

