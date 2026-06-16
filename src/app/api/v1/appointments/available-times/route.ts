import dayjs from "dayjs";
import { NextRequest } from "next/server";

import { getAvailableTimes } from "@/actions/get-available-times";
import { requireClinic } from "@/lib/api-auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";

// GET /api/v1/appointments/available-times?doctorId=xxx&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    await requireClinic();

    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (!doctorId) {
      return validationErrorResponse("doctorId is required");
    }

    if (!date) {
      return validationErrorResponse("date is required");
    }

    if (!dayjs(date).isValid()) {
      return validationErrorResponse("Invalid date format");
    }

    const availableTimes = await getAvailableTimes({
      doctorId,
      date: dayjs(date).format("YYYY-MM-DD"),
    });

    if (!availableTimes?.data) {
      return errorResponse("No available times found", 404);
    }

    return successResponse(availableTimes.data);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Clinic not found")
    ) {
      return unauthorizedResponse(error.message);
    }
    console.error("Error fetching available times:", error);
    return errorResponse("Internal server error", 500);
  }
}
