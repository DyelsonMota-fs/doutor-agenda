import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { sessionsTable, usersTable, usersToClinicsTable } from "@/db/schema";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  clinicId?: string;
  clinicName?: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);

    // Buscar sessão pelo token
    const session = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.token, token),
    });

    if (!session) {
      return null;
    }

    // Verificar se a sessão expirou
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }

    // Buscar usuário
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    if (!user) {
      return null;
    }

    // Buscar clínica do usuário
    const userClinic = await db.query.usersToClinicsTable.findFirst({
      where: eq(usersToClinicsTable.userId, session.userId),
      with: {
        clinic: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      clinicId: userClinic?.clinicId,
      clinicName: userClinic?.clinic?.name,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireClinic(): Promise<
  AuthenticatedUser & { clinicId: string }
> {
  const user = await requireAuth();
  if (!user.clinicId) {
    throw new Error("Clinic not found");
  }
  return user as AuthenticatedUser & { clinicId: string };
}
