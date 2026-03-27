import { fetchLawsByNames } from "@/lib/lawApi";
import { identifyRelevantLaws, analyzeWithGemini } from "@/lib/geminiApi";

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { chatMessage, ...formData } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(new TextEncoder().encode(sseEvent(data)));

      try {
        // 1단계: 관련 법령 파악
        send({ step: "identify" });
        let lawNames: string[] = ["소득세법"];
        try {
          lawNames = await identifyRelevantLaws(formData, chatMessage);
        } catch { /* fallback */ }

        // 2단계: 법령 fetch
        send({ step: "law", lawNames });
        let statutes: Awaited<ReturnType<typeof fetchLawsByNames>> = [];
        try {
          statutes = await fetchLawsByNames(lawNames);
        } catch { /* fallback */ }

        // 3단계: AI 분석
        send({ step: "ai" });
        const interpretation = await analyzeWithGemini(formData, statutes, chatMessage);

        send({ result: { statutes, interpretation, statutesAvailable: statutes.length > 0 } });
      } catch (e) {
        send({ error: "분석 중 오류가 발생했습니다.", detail: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
