import { fetchLawsByNames } from "@/lib/lawApi";
import { identifyRelevantLaws, chatWithGemini } from "@/lib/geminiApi";

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
  const { currentReport, chatHistory, message, formData } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(new TextEncoder().encode(sseEvent(data)));

      try {
        let statutes: Awaited<ReturnType<typeof fetchLawsByNames>> = [];
        try {
          const lawNames = await identifyRelevantLaws(formData ?? {}, message);
          statutes = await fetchLawsByNames(lawNames);
        } catch { /* fallback */ }

        const response = await chatWithGemini(currentReport, chatHistory ?? [], message, statutes);
        send({ result: { response } });
      } catch (e) {
        console.error("[/api/chat] chatWithGemini 오류:", e);
        send({ error: "채팅 처리 중 오류가 발생했습니다.", detail: String(e) });
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
