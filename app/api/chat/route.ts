import { NextResponse } from "next/server";
import { chatWithGemini } from "@/lib/geminiApi";

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { currentReport, chatHistory, message } = body;

  try {
    const response = await chatWithGemini(currentReport, chatHistory ?? [], message);
    return NextResponse.json({ response });
  } catch (e) {
    console.error("[/api/chat] chatWithGemini 오류:", e);
    return NextResponse.json(
      { error: "채팅 처리 중 오류가 발생했습니다.", detail: String(e) },
      { status: 500 }
    );
  }
}
