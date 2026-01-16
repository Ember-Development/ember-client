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

    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      include: {
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        userType: u.userType,
        internalRole: u.internalRole,
        clientRole: u.clientRole,
        isActive: u.isActive,
        projects: u.projectMemberships.map((pm) => ({
          id: pm.project.id,
          name: pm.project.name,
          slug: pm.project.slug,
          clientName: pm.project.client.name,
          clientId: pm.project.client.id,
          membershipId: pm.id,
        })),
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

