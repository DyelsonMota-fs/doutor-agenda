import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

// GET /api/v1/appointments/:id - Detalhes do agendamento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    const appointment = await db.query.appointmentsTable.findFirst({
      where: and(
        eq(appointmentsTable.id, id),
        eq(appointmentsTable.clinicId, user.clinicId),
      ),
      with: {
        doctor: true,
        patient: true,
      },
    });

    if (!appointment) {
      return notFoundResponse("Appointment not found");
    }

    return successResponse(appointment);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching appointment:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/v1/appointments/:id - Cancelar agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireClinic();

    // Verificar se o agendamento existe e pertence à clínica do usuário
    const existingAppointment = await db.query.appointmentsTable.findFirst({
      where: and(
        eq(appointmentsTable.id, id),
        eq(appointmentsTable.clinicId, user.clinicId),
      ),
    });

    if (!existingAppointment) {
      return notFoundResponse("Appointment not found");
    }

    // Deletar agendamento
    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));

    return successResponse({ message: "Appointment deleted successfully" });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error deleting appointment:", error);
    return errorResponse("Internal server error", 500);
  }
}
