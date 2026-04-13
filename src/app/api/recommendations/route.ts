import { NextResponse } from "next/server";

import { buildRecommendations } from "@/lib/acpc/recommendations";
import { StudentProfile } from "@/lib/acpc/types";

export async function POST(request: Request) {
  const profile = (await request.json()) as StudentProfile;
  const result = buildRecommendations(profile);

  return NextResponse.json(result);
}
