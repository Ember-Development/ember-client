import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendMagicLinkEmail } from "@/lib/email";
import { generateToken } from "@/lib/auth/tokens";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists - return success either way
      return NextResponse.json({ 
        success: true,
        message: "If an account exists with this email, a magic link has been sent." 
      });
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    // Invalidate any existing unused tokens for this user
    await prisma.magicLinkToken.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });

    // Create new magic link token
    await prisma.magicLinkToken.create({
      data: {
        token,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    });

    // Send email
    await sendMagicLinkEmail(user.email, token);

    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, a magic link has been sent." 
    });
  } catch (error) {
    console.error("Magic link request error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}

