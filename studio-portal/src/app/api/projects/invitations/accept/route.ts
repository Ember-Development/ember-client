import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateToken, generateSessionToken } from "@/lib/auth/tokens";
import { cookies } from "next/headers";
import { UserType, ClientRole } from ".prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_token", request.url));
    }

    // Find and validate invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            tenantId: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_invitation", request.url));
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/sign-in?error=expired_invitation", request.url));
    }

    // Check if invitation is already accepted
    if (invitation.accepted) {
      return NextResponse.redirect(new URL("/sign-in?error=invitation_already_accepted", request.url));
    }

    let targetUser = invitation.user;

    // If user doesn't exist, create account
    if (!targetUser) {
      // Determine user type based on clientRole (if clientRole is set, it's a client user)
      const userType = invitation.clientRole ? UserType.CLIENT : UserType.INTERNAL;
      
      // Generate a unique authUserId
      const authUserId = `invited_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      targetUser = await prisma.user.create({
        data: {
          tenantId: invitation.project.tenantId,
          authUserId,
          email: invitation.email.toLowerCase(),
          userType,
          clientRole: invitation.clientRole || null,
          internalRole: userType === UserType.INTERNAL ? "MEMBER" : null,
          isActive: true,
        },
      });

      // Update invitation with userId
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { userId: targetUser.id },
      });
    }

    // Check if user is already a member (in case they were added manually)
    let member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId: targetUser.id,
        },
      },
    });

    // Add user to project if not already a member
    if (!member) {
      member = await prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId: targetUser.id,
          clientRole: invitation.clientRole || null,
          isClientVisible: invitation.isClientVisible,
        },
      });
    }

    // Mark invitation as accepted
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        userId: targetUser.id, // Ensure userId is set
      },
    });

    // Create magic link token for sign-in
    const magicLinkToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    // Invalidate any existing unused tokens for this user
    await prisma.magicLinkToken.updateMany({
      where: {
        userId: targetUser.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    // Create magic link token
    await prisma.magicLinkToken.create({
      data: {
        token: magicLinkToken,
        userId: targetUser.id,
        email: targetUser.email,
        expiresAt,
      },
    });

    // Create session
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 30); // 30 days

    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: targetUser.id,
        expiresAt: sessionExpiresAt,
      },
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: sessionExpiresAt,
      path: "/",
    });

    // Redirect based on user type
    const redirectUrl =
      targetUser.userType === UserType.INTERNAL
        ? `/internal/projects/${invitation.projectId}`
        : `/portal/projects/${invitation.projectId}`;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=acceptance_failed", request.url));
  }
}

