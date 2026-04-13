import { NextResponse } from "next/server";

import { getCourses } from "@/lib/acpc/repository";

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    courses: getCourses(),
  });
}
