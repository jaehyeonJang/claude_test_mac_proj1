import { describe, it, expect, vi, beforeEach } from "vitest";

// generateText: 1번째 호출 = identifyRelevantLaws, 2번째 호출 = analyzeWithGemini
let generateTextCallCount = 0;
vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(() => {
    generateTextCallCount++;
    if (generateTextCallCount % 2 === 1) {
      return Promise.resolve({ text: '["소득세법"]' });
    }
    return Promise.resolve({ text: "절세 방안 분석 결과입니다." });
  }),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const LAW_HTML_WITH_LSISEQ =
  '<iframe src="/LSW/lsInfoP.do?lsiSeq=276127&amp;chrClsCd=010202&amp;urlMode=lsInfoP&amp;efYd=20260102&amp;ancYnChk=0"></iframe>';
const LAW_CONTENT_HTML = "<div>제1조(목적) 이 법은 소득세에 관한 사항을 규정한다.</div>";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** SSE 스트림에서 result 이벤트를 파싱하는 헬퍼 */
async function parseSSEResult(res: Response) {
  const text = await res.text();
  for (const line of text.split("\n\n")) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.result) return event.result;
    if (event.error) throw new Error(event.error);
  }
  return null;
}

const validFormData = {
  incomeType: "근로소득",
  annualIncome: "5000만원",
  dependents: "2",
  house: "1주택",
  financialIncome: "없음",
  pension: "없음",
  prepaidTax: "300만원",
  freeText: "",
};

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.resetModules();
    generateTextCallCount = 0;
    mockFetch.mockReset();
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-gemini-key";
  });

  it("SSE 스트림에서 { statutes, interpretation } result 이벤트를 반환한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_HTML_WITH_LSISEQ) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_CONTENT_HTML) });

    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(createRequest(validFormData));
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const result = await parseSSEResult(res);
    expect(result).toHaveProperty("statutes");
    expect(result).toHaveProperty("interpretation");
    expect(Array.isArray(result.statutes)).toBe(true);
    expect(typeof result.interpretation).toBe("string");
  });

  it("GOOGLE_GENERATIVE_AI_API_KEY 없으면 500 반환", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(createRequest(validFormData));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  });

  it("law.go.kr 실패 시 statutes가 빈 배열인 result를 반환한다", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(createRequest(validFormData));
    const result = await parseSSEResult(res);

    expect(result.statutes).toEqual([]);
    expect(typeof result.interpretation).toBe("string");
  });

  it("chatMessage 포함 시 interpretation을 반환한다", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_HTML_WITH_LSISEQ) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_CONTENT_HTML) });

    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(createRequest({ ...validFormData, chatMessage: "연금저축 공제도 추가해서 다시 분석해줘" }));
    const result = await parseSSEResult(res);

    expect(result.interpretation).toBeTruthy();
    expect(typeof result.interpretation).toBe("string");
  });
});
