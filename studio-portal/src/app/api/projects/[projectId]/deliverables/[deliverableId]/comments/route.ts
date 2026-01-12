import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireProjectAccess } from "@/lib/auth/guards";
import { UserType } from ".prisma/client";
import { z } from "zod";
import { sendCommentNotificationEmail } from "@/lib/email";

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Fetch all comments for this deliverable
    const allComments = await prisma.deliverableComment.findMany({
      where: { deliverableId: deliverable.id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Helper function to recursively build comment tree
    const buildCommentTree = (parentId: string | null): any[] => {
      return allComments
        .filter((c) => c.parentId === parentId)
        .map((comment) => ({
          id: comment.id,
          content: comment.content,
          author: comment.author,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          replies: buildCommentTree(comment.id), // Recursively get nested replies
        }));
    };

    // Get top-level comments (no parentId)
    const topLevelComments = buildCommentTree(null);

    return NextResponse.json({ comments: topLevelComments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  try {
    const { projectId, deliverableId } = await params;
    const { user, project } = await requireProjectAccess(projectId);

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId, projectId: project.id },
      include: {
        assignee: true,
      },
    });

    // Get project members separately
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: true,
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, parentId } = createCommentSchema.parse(body);

    // Create comment
    const comment = await prisma.deliverableComment.create({
      data: {
        deliverableId: deliverable.id,
        authorId: user.id,
        content,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Determine who to notify
    const usersToNotify = new Set<string>();
    
    // Notify assignee (if not the commenter)
    if (deliverable.assigneeId && deliverable.assigneeId !== user.id) {
      usersToNotify.add(deliverable.assigneeId);
    }

    // Notify all project members (except commenter)
    projectMembers.forEach((member) => {
      if (member.userId !== user.id && member.user.isActive) {
        usersToNotify.add(member.userId);
      }
    });

    // If it's a reply, notify the parent comment author
    if (parentId) {
      const parentComment = await prisma.deliverableComment.findUnique({
        where: { id: parentId },
        include: { author: true },
      });
      if (parentComment && parentComment.authorId !== user.id) {
        usersToNotify.add(parentComment.authorId);
      }
    }

    // Create notifications and send emails
    const commentAuthorName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

    const deliverableUrl = `/internal/projects/${project.id}/kanban`;
    const isReply = !!parentId;

    for (const userId of usersToNotify) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) continue;

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: isReply ? "COMMENT_REPLY" : "COMMENT",
          title: isReply
            ? `${commentAuthorName} replied to a comment on "${deliverable.title}"`
            : `${commentAuthorName} commented on "${deliverable.title}"`,
          message: content.length > 100 ? content.substring(0, 100) + "..." : content,
          link: deliverableUrl,
          metadata: JSON.stringify({
            deliverableId: deliverable.id,
            commentId: comment.id,
            projectId: project.id,
          }),
        },
      });

      // Send email notification
      await sendCommentNotificationEmail(
        targetUser.email,
        deliverable.title,
        commentAuthorName,
        content,
        isReply,
        project.name,
        deliverableUrl
      );
    }

    return NextResponse.json({
      comment: {
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        replies: [],
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

