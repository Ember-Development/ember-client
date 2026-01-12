import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole } from ".prisma/client";
import { z } from "zod";

const createClientSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireInternalUser();

    const clients = await prisma.client.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("List clients error:", error);
    return NextResponse.json(
      { error: "Failed to list clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireInternalUser();

    // Only admins and owners can create clients
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createClientSchema.parse(body);

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingClient = await prisma.client.findUnique({
      where: {
        tenantId_slug: {
          tenantId: user.tenantId,
          slug,
        },
      },
    });

    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this name already exists" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        tenantId: user.tenantId,
        name: data.name,
        slug,
        website: data.website || null,
        notes: data.notes || null,
        status: data.status || null,
      },
    });

    return NextResponse.json({
      ...client,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Create client error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

