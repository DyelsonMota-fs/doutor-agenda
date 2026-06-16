import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  sex: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Sex must be male or female" }),
  }),
});

// GET /api/v1/patients - Listar pacientes
export async function GET() {
  try {
    const user = await requireClinic();

    const patients = await db.query.patientsTable.findMany({
      where: eq(patientsTable.clinicId, user.clinicId),
      orderBy: (patients, { desc }) => [desc(patients.createdAt)],
    });

    return successResponse(patients);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching patients:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/v1/patients - Criar paciente
export async function POST(request: NextRequest) {
  try {
    const user = await requireClinic();
    const body = await request.json();

    // Validar dados
    const validation = createPatientSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    const data = validation.data;

    // Criar paciente
    const [patient] = await db
      .insert(patientsTable)
      .values({
        ...data,
        clinicId: user.clinicId,
      })
      .returning();

    return successResponse(patient, 201);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error creating patient:", error);
    return errorResponse("Internal server error", 500);
  }
}

