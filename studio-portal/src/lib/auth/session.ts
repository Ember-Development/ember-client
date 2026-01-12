import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { UserType } from ".prisma/client";

/**
 * Get the current session user from the session token cookie.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;

  // Find valid session
  const session = await prisma.session.findFirst({
    where: {
      token: sessionToken,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: { tenant: true },
      },
    },
  });

  if (!session || !session.user.isActive) {
    // Clean up invalid session
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

export function isInternal(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user?.userType === UserType.INTERNAL;
}

