import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireInternalUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as UserType | null;

    const where: any = {
      tenantId: user.tenantId,
      isActive: true,
    };

    if (type) {
      where.userType = type;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        internalRole: true,
        clientRole: true,
      },
      orderBy: [
        { userType: "asc" },
        { email: "asc" },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

