import { NextResponse } from "next/server";
import { fetchLawsByNames } from "@/lib/lawApi";
import { identifyRelevantLaws, analyzeWithGemini } from "@/lib/geminiApi";

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { chatMessage, ...formData } = body;

  // 1단계: 질문 분석 → 관련 법령명 추출
  let statutes: Awaited<ReturnType<typeof fetchLawsByNames>> = [];
  let statutesAvailable = false;
  try {
    const lawNames = await identifyRelevantLaws(formData, chatMessage);
    // 2단계: 법령명으로 실제 법령 fetch
    statutes = await fetchLawsByNames(lawNames);
    statutesAvailable = statutes.length > 0;
  } catch {
    statutes = [];
    statutesAvailable = false;
  }

  // 3단계: 법령 기반 분석
  try {
    const interpretation = await analyzeWithGemini(formData, statutes, chatMessage);
    return NextResponse.json({
      statutes,
      interpretation,
      statutesAvailable,
    });
  } catch (e) {
    console.error("[/api/analyze] analyzeWithGemini 오류:", e);
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다.", detail: String(e) },
      { status: 500 }
    );
  }
}
