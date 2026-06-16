import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { usersTable, usersToClinicsTable } from "@/db/schema";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { auth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    // Validar dados
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    const { email, password } = validation.data;

    // Fazer login usando better-auth internamente
    let loginResult;
    try {
      loginResult = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });
    } catch {
      return errorResponse("Invalid credentials", 401);
    }

    if (!loginResult) {
      return errorResponse("Invalid credentials", 401);
    }

    // Buscar usuário
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    // Buscar clínica do usuário
    const userClinic = await db.query.usersToClinicsTable.findFirst({
      where: eq(usersToClinicsTable.userId, user.id),
      with: {
        clinic: true,
      },
    });

    return successResponse({
      token: loginResult.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clinic: userClinic?.clinic
          ? {
              id: userClinic.clinic.id,
              name: userClinic.clinic.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
