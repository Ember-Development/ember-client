import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole, UserType, ClientRole } from ".prisma/client";
import { z } from "zod";
import { generateToken } from "@/lib/auth/tokens";
import { sendMagicLinkEmail } from "@/lib/email";

const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  userType: z.nativeEnum(UserType),
  internalRole: z.nativeEnum(InternalRole).optional().nullable(),
  clientRole: z.nativeEnum(ClientRole).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireInternalUser();

    // Only admins and owners can invite users
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = inviteUserSchema.parse(body);

    // Validate role based on user type
    if (data.userType === UserType.INTERNAL && !data.internalRole) {
      return NextResponse.json(
        { error: "Internal role is required for internal users" },
        { status: 400 }
      );
    }

    if (data.userType === UserType.CLIENT && !data.clientRole) {
      return NextResponse.json(
        { error: "Client role is required for client users" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists", userId: existingUser.id },
        { status: 400 }
      );
    }

    // Generate a unique authUserId (in production, this would come from your auth provider)
    const authUserId = `invited_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        tenantId: user.tenantId,
        authUserId,
        email: data.email.toLowerCase(),
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        userType: data.userType,
        internalRole: data.internalRole || null,
        clientRole: data.clientRole || null,
        isActive: true,
      },
    });

    // Generate magic link token for invitation
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days for invitations

    // Invalidate any existing unused tokens for this user
    await prisma.magicLinkToken.updateMany({
      where: {
        userId: newUser.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    // Create magic link token
    await prisma.magicLinkToken.create({
      data: {
        token,
        userId: newUser.id,
        email: newUser.email,
        expiresAt,
      },
    });

    // Send invitation email
    await sendMagicLinkEmail(newUser.email, token);

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        internalRole: newUser.internalRole,
        clientRole: newUser.clientRole,
      },
    });
  } catch (error) {
    console.error("Invite user error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}

