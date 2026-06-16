import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const createDoctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatarImageUrl: z.string().url().optional(),
  specialty: z.string().min(1, "Specialty is required"),
  appointmentPriceInCents: z.number().int().positive(),
  availableFromWeekDay: z.number().int().min(0).max(6),
  availableToWeekDay: z.number().int().min(0).max(6),
  availableFromTime: z.string().regex(/^\d{2}:\d{2}$/),
  availableToTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// GET /api/v1/doctors - Listar médicos
export async function GET() {
  try {
    const user = await requireClinic();

    const doctors = await db.query.doctorsTable.findMany({
      where: eq(doctorsTable.clinicId, user.clinicId),
      orderBy: (doctors, { desc }) => [desc(doctors.createdAt)],
    });

    return successResponse(doctors);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching doctors:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/v1/doctors - Criar médico
export async function POST(request: NextRequest) {
  try {
    const user = await requireClinic();
    const body = await request.json();

    // Validar dados
    const validation = createDoctorSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    const data = validation.data;

    // Criar médico
    const [doctor] = await db
      .insert(doctorsTable)
      .values({
        ...data,
        clinicId: user.clinicId,
      })
      .returning();

    return successResponse(doctor, 201);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error creating doctor:", error);
    return errorResponse("Internal server error", 500);
  }
}
