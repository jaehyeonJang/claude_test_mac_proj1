import { NextResponse } from "next/server";
import { searchStatutes, buildSearchQuery } from "@/lib/lawApi";
import { analyzeWithGemini } from "@/lib/geminiApi";

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { chatMessage, ...formData } = body;

  const query = buildSearchQuery(formData);

  let statutes: Awaited<ReturnType<typeof searchStatutes>> = [];
  let statutesAvailable = false;

  try {
    statutes = await searchStatutes(query);
    statutesAvailable = statutes.length > 0;
  } catch {
    statutes = [];
    statutesAvailable = false;
  }

  try {
    const interpretation = await analyzeWithGemini(formData, statutes, chatMessage);
    return NextResponse.json({ statutes, interpretation, statutesAvailable });
  } catch (e) {
    console.error("[/api/analyze] analyzeWithGemini 오류:", e);
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다.", detail: String(e) },
      { status: 500 }
    );
  }
}
