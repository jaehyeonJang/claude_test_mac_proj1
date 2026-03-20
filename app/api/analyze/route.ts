import { NextResponse } from "next/server";
import { searchStatutes, buildSearchQuery } from "@/lib/lawApi";
import { analyzeWithGemini } from "@/lib/geminiApi";

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { chatMessage, ...formData } = body;

  const query = buildSearchQuery(formData);

  const [statutes, interpretation] = await Promise.all([
    searchStatutes(query).catch(() => []),
    analyzeWithGemini(formData, [], chatMessage),
  ]);

  // Re-run Gemini with statutes if we got any (statutes enrich the analysis)
  // For parallel execution, we start both immediately but Gemini initially runs without statutes
  // If statutes came back, we already have the interpretation from the parallel call
  // In a production app, you might use a streaming approach instead

  return NextResponse.json({ statutes, interpretation });
}
