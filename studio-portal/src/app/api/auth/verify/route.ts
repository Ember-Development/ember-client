import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSessionToken } from "@/lib/auth/tokens";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_token", request.url));
    }

    // Find and validate token
    const magicLinkToken = await prisma.magicLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLinkToken) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_token", request.url));
    }

    // Check if token is expired
    if (magicLinkToken.expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/sign-in?error=expired_token", request.url));
    }

    // Check if token is already used
    if (magicLinkToken.used) {
      return NextResponse.redirect(new URL("/sign-in?error=token_used", request.url));
    }

    // Check if user is active
    if (!magicLinkToken.user.isActive) {
      return NextResponse.redirect(new URL("/sign-in?error=account_inactive", request.url));
    }

    // Mark token as used
    await prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { used: true, usedAt: new Date() },
    });

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: magicLinkToken.user.id,
        expiresAt,
      },
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    // Redirect based on user type
    const userType = magicLinkToken.user.userType;
    const redirectUrl = userType === "INTERNAL" ? "/internal" : "/portal";
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Magic link verification error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=verification_failed", request.url));
  }
}

