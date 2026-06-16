import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getAvailableTimes } from "@/actions/get-available-times";
import { db } from "@/db";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const createAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  patientId: z.string().uuid("Invalid patient ID"),
  date: z.string().refine((date) => dayjs(date).isValid(), {
    message: "Invalid date",
  }),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  appointmentPriceInCents: z.number().int().positive(),
});

// GET /api/v1/appointments - Listar agendamentos
export async function GET() {
  try {
    const user = await requireClinic();

    const appointments = await db.query.appointmentsTable.findMany({
      where: eq(appointmentsTable.clinicId, user.clinicId),
      with: {
        doctor: true,
        patient: true,
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)],
    });

    return successResponse(appointments);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching appointments:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/v1/appointments - Criar agendamento
export async function POST(request: NextRequest) {
  try {
    const user = await requireClinic();
    const body = await request.json();

    // Validar dados
    const validation = createAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(
        validation.error.errors[0]?.message || "Validation error",
      );
    }

    const { doctorId, patientId, date, time, appointmentPriceInCents } =
      validation.data;

    // Verificar se o médico pertence à clínica
    const doctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, doctorId),
        eq(doctorsTable.clinicId, user.clinicId),
      ),
    });

    if (!doctor) {
      return errorResponse("Doctor not found", 404);
    }

    // Verificar se o paciente pertence à clínica
    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, patientId),
        eq(patientsTable.clinicId, user.clinicId),
      ),
    });

    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Verificar disponibilidade do horário
    const availableTimes = await getAvailableTimes({
      doctorId,
      date: dayjs(date).format("YYYY-MM-DD"),
    });

    if (!availableTimes?.data) {
      return errorResponse("No available times", 400);
    }

    const isTimeAvailable = availableTimes.data?.some(
      (t) => t.value === time && t.available,
    );

    if (!isTimeAvailable) {
      return errorResponse("Time not available", 400);
    }

    // Criar agendamento
    const appointmentDateTime = dayjs(date)
      .set("hour", parseInt(time.split(":")[0]))
      .set("minute", parseInt(time.split(":")[1]))
      .toDate();

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        doctorId,
        patientId,
        clinicId: user.clinicId,
        date: appointmentDateTime,
        appointmentPriceInCents,
      })
      .returning();

    return successResponse(appointment, 201);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error creating appointment:", error);
    return errorResponse("Internal server error", 500);
  }
}
