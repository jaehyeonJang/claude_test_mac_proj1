import { NextRequest, NextResponse } from "next/server";
import { identifyRequiredFields } from "@/lib/geminiApi";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let body: { request?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { request } = body;
  if (!request || typeof request !== "string" || request.trim().length === 0) {
    return NextResponse.json({ error: "request is required" }, { status: 400 });
  }

  const result = await identifyRequiredFields(request.trim());
  return NextResponse.json(result);
}
