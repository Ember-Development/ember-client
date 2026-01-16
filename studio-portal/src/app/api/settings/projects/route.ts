import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole } from ".prisma/client";

export async function GET() {
  try {
    const user = await requireInternalUser();

    // Only admins and owners can access settings
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
      where: { tenantId: user.tenantId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        clientName: p.client.name,
        clientId: p.client.id,
      })),
    });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

