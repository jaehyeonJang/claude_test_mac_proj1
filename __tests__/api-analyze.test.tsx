import { describe, it, expect, vi, beforeEach } from "vitest";

// generateText: 1번째 호출 = identifyRelevantLaws (법령명 반환), 2번째 호출 = analyzeWithGemini
let generateTextCallCount = 0;
vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(() => {
    generateTextCallCount++;
    if (generateTextCallCount === 1) {
      return Promise.resolve({ text: '["소득세법"]' });
    }
    return Promise.resolve({ text: "절세 방안 분석 결과입니다." });
  }),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

// Mock global fetch for law.go.kr (getLsiSeq + fetchLawContent)
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const LAW_HTML_WITH_LSISEQ =
  '<iframe src="/LSW/lsInfoP.do?lsiSeq=276127&amp;chrClsCd=010202&amp;urlMode=lsInfoP&amp;efYd=20260102&amp;ancYnChk=0"></iframe>';
const LAW_CONTENT_HTML = "<div>제1조(목적) 이 법은 소득세에 관한 사항을 규정한다.</div>";

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

  it("returns { statutes, interpretation } shape with valid data", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_HTML_WITH_LSISEQ) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_CONTENT_HTML) });

    const { POST } = await import("@/app/api/analyze/route");
    const req = createRequest(validFormData);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("statutes");
    expect(json).toHaveProperty("interpretation");
    expect(Array.isArray(json.statutes)).toBe(true);
    expect(typeof json.interpretation).toBe("string");
  });

  it("returns 500 without GOOGLE_GENERATIVE_AI_API_KEY", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { POST } = await import("@/app/api/analyze/route");
    const req = createRequest(validFormData);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  });

  it("returns empty statutes when law.go.kr fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { POST } = await import("@/app/api/analyze/route");
    const req = createRequest(validFormData);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.statutes).toEqual([]);
    expect(typeof json.interpretation).toBe("string");
  });

  it("includes interpretation string in response", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_HTML_WITH_LSISEQ) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(LAW_CONTENT_HTML) });

    const { POST } = await import("@/app/api/analyze/route");
    const req = createRequest({
      ...validFormData,
      chatMessage: "연금저축 공제도 추가해서 다시 분석해줘",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.interpretation).toBeTruthy();
    expect(typeof json.interpretation).toBe("string");
  });
});
