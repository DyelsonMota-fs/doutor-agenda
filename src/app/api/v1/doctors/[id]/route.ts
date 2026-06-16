import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const updateDoctorSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  avatarImageUrl: z.string().url().optional().nullable(),
  specialty: z.string().min(1, "Specialty is required").optional(),
  appointmentPriceInCents: z.number().int().positive().optional(),
  availableFromWeekDay: z.number().int().min(0).max(6).optional(),
  availableToWeekDay: z.number().int().min(0).max(6).optional(),
  availableFromTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  availableToTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

// GET /api/v1/doctors/:id - Detalhes do médico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    const doctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, id),
        eq(doctorsTable.clinicId, user.clinicId),
      ),
    });

    if (!doctor) {
      return notFoundResponse("Doctor not found");
    }

    return successResponse(doctor);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching doctor:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/v1/doctors/:id - Atualizar médico
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();
    const body = await request.json();

    // Validar dados
    const validation = updateDoctorSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    // Verificar se o médico existe e pertence à clínica do usuário
    const existingDoctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, id),
        eq(doctorsTable.clinicId, user.clinicId),
      ),
    });

    if (!existingDoctor) {
      return notFoundResponse("Doctor not found");
    }

    // Atualizar médico
    const [updatedDoctor] = await db
      .update(doctorsTable)
      .set(validation.data)
      .where(eq(doctorsTable.id, id))
      .returning();

    return successResponse(updatedDoctor);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error updating doctor:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/v1/doctors/:id - Deletar médico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    // Verificar se o médico existe e pertence à clínica do usuário
    const existingDoctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, id),
        eq(doctorsTable.clinicId, user.clinicId),
      ),
    });

    if (!existingDoctor) {
      return notFoundResponse("Doctor not found");
    }

    // Deletar médico
    await db.delete(doctorsTable).where(eq(doctorsTable.id, id));

    return successResponse({ message: "Doctor deleted successfully" });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error deleting doctor:", error);
    return errorResponse("Internal server error", 500);
  }
}
