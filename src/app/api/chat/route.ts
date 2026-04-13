import { NextResponse } from "next/server";

import { createChatResponse } from "@/lib/acpc/chat-service";
import { ChatRequest } from "@/lib/acpc/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequest;

    if (!payload.message?.trim()) {
      return NextResponse.json(
        {
          error: "A question is required.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await createChatResponse({
      ...payload,
      message: payload.message.trim(),
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        error: "Unable to prepare the ACPC response right now.",
      },
      {
        status: 500,
      },
    );
  }
}
