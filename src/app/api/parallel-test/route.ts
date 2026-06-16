import { NextResponse } from "next/server";

import { runParallelCalculation } from "@/services/parallel.service";

export async function GET() {
  const result = await runParallelCalculation();
  return NextResponse.json(result);
}
