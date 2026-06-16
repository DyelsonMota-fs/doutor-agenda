import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const updatePatientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  phoneNumber: z.string().min(1, "Phone number is required").optional(),
  sex: z
    .enum(["male", "female"], {
      errorMap: () => ({ message: "Sex must be male or female" }),
    })
    .optional(),
});

// GET /api/v1/patients/:id - Detalhes do paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, id),
        eq(patientsTable.clinicId, user.clinicId),
      ),
    });

    if (!patient) {
      return notFoundResponse("Patient not found");
    }

    return successResponse(patient);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching patient:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/v1/patients/:id - Atualizar paciente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();
    const body = await request.json();

    // Validar dados
    const validation = updatePatientSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, id),
        eq(patientsTable.clinicId, user.clinicId),
      ),
    });

    if (!existingPatient) {
      return notFoundResponse("Patient not found");
    }

    // Atualizar paciente
    const [updatedPatient] = await db
      .update(patientsTable)
      .set(validation.data)
      .where(eq(patientsTable.id, id))
      .returning();

    return successResponse(updatedPatient);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error updating patient:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/v1/patients/:id - Deletar paciente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, id),
        eq(patientsTable.clinicId, user.clinicId),
      ),
    });

    if (!existingPatient) {
      return notFoundResponse("Patient not found");
    }

    // Deletar paciente
    await db.delete(patientsTable).where(eq(patientsTable.id, id));

    return successResponse({ message: "Patient deleted successfully" });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error deleting patient:", error);
    return errorResponse("Internal server error", 500);
  }
}
