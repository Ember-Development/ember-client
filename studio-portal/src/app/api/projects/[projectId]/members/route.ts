import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { createMemberAddedUpdate } from "@/lib/projects/updates";
import { generateToken } from "@/lib/auth/tokens";
import { sendProjectInvitationEmail } from "@/lib/email";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    // Only internal users can view all members
    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userType: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        clientRole: member.clientRole,
        isClientVisible: member.isClientVisible,
        user: member.user,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get project members error:", error);
    return NextResponse.json(
      { error: "Failed to get project members" },
      { status: 500 }
    );
  }
}

const addMemberSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  clientRole: z.enum(["CLIENT_ADMIN", "CLIENT_VIEWER"]).optional().nullable(),
  isClientVisible: z.boolean().optional(),
}).refine((data) => data.userId || data.email, {
  message: "Either userId or email must be provided",
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    if (user.userType !== UserType.INTERNAL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = addMemberSchema.parse(body);

    // If email is provided, create an invitation
    if (data.email) {
      const email = data.email.toLowerCase();

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          tenantId: user.tenantId,
        },
      });

      // Check if user is already a member
      if (existingUser) {
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          return NextResponse.json(
            { error: "User is already a member of this project" },
            { status: 400 }
          );
        }
      }

      // Check if there's already a pending invitation for this email and project
      const existingInvitation = await prisma.projectInvitation.findFirst({
        where: {
          projectId: project.id,
          email,
          accepted: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: "An invitation has already been sent to this email" },
          { status: 400 }
        );
      }

      // Generate invitation token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

      // Create invitation
      const invitation = await prisma.projectInvitation.create({
        data: {
          projectId: project.id,
          email,
          userId: existingUser?.id || null,
          invitedById: user.id,
          token,
          expiresAt,
          clientRole: data.clientRole || null,
          isClientVisible: data.isClientVisible ?? true,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      // Get inviter name
      const inviterName =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

      // Send invitation email
      try {
        await sendProjectInvitationEmail(
          email,
          token,
          invitation.project.name,
          inviterName,
          !existingUser
        );
      } catch (error) {
        console.error("Failed to send invitation email:", error);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          projectId: invitation.projectId,
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
        },
        message: "Invitation sent successfully",
      });
    }

    // If userId is provided, add user directly (existing behavior)
    if (data.userId) {
      // Check if member already exists
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: data.userId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this project" },
          { status: 400 }
        );
      }

      // Get user details for the update
      const addedUser = await prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const member = await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: data.userId,
          clientRole: data.clientRole || null,
          isClientVisible: data.isClientVisible ?? true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              userType: true,
            },
          },
        },
      });

      // Create project update for new member
      if (addedUser) {
        const memberName =
          `${addedUser.firstName || ""} ${addedUser.lastName || ""}`.trim() ||
          addedUser.email;
        try {
          await createMemberAddedUpdate(project.id, memberName, user.id);
        } catch (error) {
          console.error("Error creating member update:", error);
          // Don't fail the request if update creation fails
        }
      }

      return NextResponse.json({
        ...member,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      });
    }
  } catch (error) {
    console.error("Add project member error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to add project member" },
      { status: 500 }
    );
  }
}

