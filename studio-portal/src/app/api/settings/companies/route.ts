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

    const clients = await prisma.client.findMany({
      where: { tenantId: user.tenantId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            phase: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      companies: clients.map((client) => ({
        id: client.id,
        name: client.name,
        slug: client.slug,
        website: client.website,
        notes: client.notes,
        status: client.status,
        projects: client.projects.map((project) => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          status: project.status,
          phase: project.phase,
          createdAt: project.createdAt.toISOString(),
        })),
        createdAt: client.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

