import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInternalUser } from "@/lib/auth/guards";
import { InternalRole } from ".prisma/client";
import { z } from "zod";
import { ProjectStatus, ProjectPhase, PricingModel } from ".prisma/client";
import { generateToken } from "@/lib/auth/tokens";
import { sendProjectInvitationEmail } from "@/lib/email";

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  phase: z.nativeEnum(ProjectPhase).optional(),
  startDate: z.string().datetime().optional().nullable(),
  targetLaunchDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime(),
  pricingModel: z.nativeEnum(PricingModel).optional().nullable(),
  weeklyCapacityHours: z.number().int().positive().optional().nullable(),
  hourlyRateCents: z.number().int().positive().optional().nullable(),
  fixedPriceCents: z.number().int().positive().optional().nullable(),
  retainerAmountCents: z.number().int().positive().optional().nullable(),
  retainerFrequency: z.string().optional().nullable(),
  pricingNotes: z.string().optional().nullable(),
  clientEmails: z.array(z.string().email()).optional(), // Emails of clients to invite
  internalUserIds: z.array(z.string()).optional(), // IDs of internal users to add
}).refine(
  (data) => {
    // If pricingModel is HOURLY, hourlyRateCents should ideally be provided
    // But it's optional since pricing can be set later
    if (data.pricingModel === PricingModel.HOURLY) {
      return true; // Optional - can be set later
    }
    return true;
  },
  {
    message: "Hourly rate is recommended for hourly pricing model",
  }
).refine(
  (data) => {
    // If pricingModel is FIXED_PRICE, fixedPriceCents should ideally be provided
    if (data.pricingModel === PricingModel.FIXED_PRICE) {
      return true; // Optional - can be set later
    }
    return true;
  },
  {
    message: "Fixed price amount is recommended for fixed price model",
  }
).refine(
  (data) => {
    // If pricingModel is RETAINER, retainerAmountCents and retainerFrequency should ideally be provided
    if (data.pricingModel === PricingModel.RETAINER) {
      return true; // Optional - can be set later
    }
    return true;
  },
  {
    message: "Retainer amount and frequency are recommended for retainer model",
  }
);

export async function POST(request: Request) {
  try {
    const user = await requireInternalUser();

    // Only admins and owners can create projects
    if (user.internalRole !== InternalRole.ADMIN && user.internalRole !== InternalRole.OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createProjectSchema.parse(body);

    // Verify client exists and belongs to tenant
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId: user.tenantId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingProject = await prisma.project.findUnique({
      where: {
        tenantId_slug: {
          tenantId: user.tenantId,
          slug,
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 400 }
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        tenantId: user.tenantId,
        clientId: client.id,
        name: data.name,
        slug,
        description: data.description || null,
        status: data.status || ProjectStatus.PLANNING,
        phase: data.phase || ProjectPhase.DISCOVERY,
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetLaunchDate: data.targetLaunchDate ? new Date(data.targetLaunchDate) : null,
        dueDate: new Date(data.dueDate),
        pricingModel: data.pricingModel || PricingModel.TBD,
        weeklyCapacityHours: data.weeklyCapacityHours || null,
        hourlyRateCents: data.hourlyRateCents || null,
        fixedPriceCents: data.fixedPriceCents || null,
        retainerAmountCents: data.retainerAmountCents || null,
        retainerFrequency: data.retainerFrequency || null,
        pricingNotes: data.pricingNotes || null,
      },
      include: {
        client: true,
      },
    });

    // Add creator as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
      },
    });

    // Add internal users if provided
    if (data.internalUserIds && data.internalUserIds.length > 0) {
      const internalUsers = await prisma.user.findMany({
        where: {
          id: { in: data.internalUserIds },
          tenantId: user.tenantId,
          userType: "INTERNAL",
        },
      });

      await prisma.projectMember.createMany({
        data: internalUsers.map((u) => ({
          projectId: project.id,
          userId: u.id,
        })),
        skipDuplicates: true,
      });
    }

    // Invite client users if emails provided
    if (data.clientEmails && data.clientEmails.length > 0) {
      const clientUsers = await prisma.user.findMany({
        where: {
          email: { in: data.clientEmails.map((e) => e.toLowerCase()) },
          tenantId: user.tenantId,
          userType: "CLIENT",
        },
      });

      // Add existing client users as members
      if (clientUsers.length > 0) {
        await prisma.projectMember.createMany({
          data: clientUsers.map((u) => ({
            projectId: project.id,
            userId: u.id,
            clientRole: "CLIENT_ADMIN", // Default role
            isClientVisible: true,
          })),
          skipDuplicates: true,
        });
      }

      // For emails that don't have accounts yet, create invitations
      const existingEmails = clientUsers.map((u) => u.email.toLowerCase());
      const newEmails = data.clientEmails.filter(
        (e) => !existingEmails.includes(e.toLowerCase())
      );

      if (newEmails.length > 0) {
        // Get inviter name
        const inviterName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

        // Create invitations for new emails
        for (const email of newEmails) {
          const token = generateToken();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

          try {
            const invitation = await prisma.projectInvitation.create({
              data: {
                projectId: project.id,
                email: email.toLowerCase(),
                invitedById: user.id,
                token,
                expiresAt,
                clientRole: "CLIENT_ADMIN", // Default role
                isClientVisible: true,
              },
            });

            // Send invitation email
            try {
              await sendProjectInvitationEmail(
                email.toLowerCase(),
                token,
                project.name,
                inviterName,
                true // isNewUser
              );
            } catch (error) {
              console.error(`Failed to send invitation email to ${email}:`, error);
              // Don't fail the request if email fails
            }
          } catch (error) {
            console.error(`Failed to create invitation for ${email}:`, error);
            // Continue with other emails
          }
        }
      }
    }

    return NextResponse.json({
      project: {
        ...project,
        startDate: project.startDate?.toISOString() || null,
        targetLaunchDate: project.targetLaunchDate?.toISOString() || null,
        dueDate: project.dueDate.toISOString(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create project error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

