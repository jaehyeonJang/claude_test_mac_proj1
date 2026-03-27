import { NextResponse } from "next/server";
import { fetchLawsByNames } from "@/lib/lawApi";
import { identifyRelevantLaws, chatWithGemini } from "@/lib/geminiApi";

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { currentReport, chatHistory, message, formData } = body;

  // 1. 질문 기반 관련 법령 동적 식별 및 fetch
  let statutes = [];
  try {
    const lawNames = await identifyRelevantLaws(formData ?? {}, message);
    statutes = await fetchLawsByNames(lawNames);
  } catch {
    statutes = [];
  }

  // 2. 법령 근거로 답변 생성 (실패 시 lawNotice가 프롬프트에 포함됨)
  try {
    const response = await chatWithGemini(currentReport, chatHistory ?? [], message, statutes);
    return NextResponse.json({ response });
  } catch (e) {
    console.error("[/api/chat] chatWithGemini 오류:", e);
    return NextResponse.json(
      { error: "채팅 처리 중 오류가 발생했습니다.", detail: String(e) },
      { status: 500 }
    );
  }
}
