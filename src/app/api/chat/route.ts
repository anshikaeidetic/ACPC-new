import { NextResponse } from "next/server";

import { createChatResponse } from "@/lib/acpc/chat-service";
import { ChatRequest } from "@/lib/acpc/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatRequest;
  const response = await createChatResponse(payload);

  return NextResponse.json(response);
}
