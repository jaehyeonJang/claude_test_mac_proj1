import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ai SDK
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "절세 방안 분석 결과입니다.",
  }),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

// Mock global fetch for law.go.kr
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
    mockFetch.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.LAW_GO_KR_API_KEY = "test-law-key";
  });

  it("returns { statutes, interpretation } shape with valid data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          LawSearch: {
            law: [
              { "법령명한글": "소득세법", "법령내용": "소득세법 내용" },
            ],
          },
        }),
    });

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

  it("returns 500 without GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;

    const { POST } = await import("@/app/api/analyze/route");
    const req = createRequest(validFormData);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("GEMINI_API_KEY not configured");
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
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ LawSearch: { law: [] } }),
    });

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
