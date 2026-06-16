import { NextResponse } from "next/server";

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code?: string;
  };
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    { status },
  );
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorResponse(message, 401, "UNAUTHORIZED");
}

export function notFoundResponse(message: string = "Not found") {
  return errorResponse(message, 404, "NOT_FOUND");
}

export function validationErrorResponse(message: string = "Validation error") {
  return errorResponse(message, 422, "VALIDATION_ERROR");
}
