import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { request } = await req.json();
  if (!request || typeof request !== "string") {
    return NextResponse.json({ error: "request is required" }, { status: 400 });
  }
  // TODO: implement in Task 3
  return NextResponse.json({ fields: [] });
}
