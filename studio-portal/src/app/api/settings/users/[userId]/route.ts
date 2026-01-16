import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole } from ".prisma/client";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireInternalUser();
    const { userId } = await params;

    // Only admins and owners can delete users
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Prevent users from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Verify user exists and belongs to the same tenant
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDelete.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

