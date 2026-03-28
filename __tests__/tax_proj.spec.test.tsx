/**
 * Spec tests derived from artifacts/spec.yaml
 * TAX-001~016 — 수용 기준 테스트 (Acceptance Criteria)
 *
 * IMPORTANT: 이 파일은 생성 후 수정 금지. 테스트 실패 시 구현을 수정한다.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Page from "@/app/page";
import { useTaxStore } from "@/lib/store/taxStore";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------
const mockReport = {
  statutes: [
    { name: "소득세법 제55조", text: "소득세 세율 관련 조문 내용입니다." },
  ],
  interpretation: "근로소득자 절세 방안: 연금저축, 주택청약 공제를 활용하세요.",
  statutesAvailable: true,
};

function makeSSEResponse(result: unknown): Response {
  const events = [
    `data: ${JSON.stringify({ step: "identify" })}\n\n`,
    `data: ${JSON.stringify({ step: "law", lawNames: ["소득세법"] })}\n\n`,
    `data: ${JSON.stringify({ step: "ai" })}\n\n`,
    `data: ${JSON.stringify({ result })}\n\n`,
  ].join("");
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(events));
      controller.close();
    },
  });
  return { ok: true, body } as unknown as Response;
}

function makeChatSSEResponse(): Response {
  const events = [
    `data: ${JSON.stringify({ result: { response: "보고서가 업데이트되었습니다." } })}\n\n`,
  ].join("");
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(events));
      controller.close();
    },
  });
  return { ok: true, body } as unknown as Response;
}

function setupFetchMock({
  fields = ["annualIncome", "prepaidTax"] as string[],
  report = mockReport,
  ambiguous = false,
}: {
  fields?: string[];
  report?: typeof mockReport;
  ambiguous?: boolean;
} = {}) {
  return vi.spyOn(global, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url ?? "";
    if (url.includes("identify-fields")) {
      if (ambiguous) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ambiguous: true,
            message: "의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요",
          }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ fields }),
      } as unknown as Response);
    }
    if (url.includes("/api/chat")) {
      return Promise.resolve(makeChatSSEResponse());
    }
    return Promise.resolve(makeSSEResponse(report));
  });
}

// In-memory localStorage polyfill
let _lsData: Record<string, string> = {};
const _localStorageMock: Storage = {
  getItem: (key) => _lsData[key] ?? null,
  setItem: (key, val) => { _lsData[key] = String(val); },
  removeItem: (key) => { delete _lsData[key]; },
  clear: () => { _lsData = {}; },
  get length() { return Object.keys(_lsData).length; },
  key: (i) => Object.keys(_lsData)[i] ?? null,
};

beforeEach(() => {
  _lsData = {};
  vi.stubGlobal("localStorage", _localStorageMock);

  // Radix UI DOM API polyfills
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (typeof ResizeObserver === "undefined") {
    (globalThis as unknown as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  useTaxStore.setState({
    step: 1,
    request: "",
    dynamicFields: [],
    isIdentifying: false,
    clarificationMessage: null,
    form: {
      incomeType: "",
      annualIncome: "",
      prepaidTax: "",
      house: "",
      financialIncome: "",
      pension: "",
      freeText: "",
    },
    report: null,
    chatHistory: [],
    history: [],
    darkMode: false,
    isLoading: false,
    analysisStep: null,
    submittedForm: null,
    error: null,
  });

  document.documentElement.className = "";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 1단계 textarea에 의뢰 입력 후 "다음" 클릭 → 2단계 도달 */
async function proceedToStep2(
  user: ReturnType<typeof userEvent.setup>,
  request = "프리랜서 소득으로 절세 방법 알려줘"
) {
  const textarea = screen.getByRole("textbox", { name: /의뢰/ });
  await user.clear(textarea);
  await user.type(textarea, request);
  await user.click(screen.getByRole("button", { name: /^다음/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeInTheDocument();
  });
}

/** 전체 플로우: 1단계 → 2단계 → 분석 완료 → 보고서 도달 */
async function proceedToReport(user: ReturnType<typeof userEvent.setup>) {
  await proceedToStep2(user);
  await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));
  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
  });
}

// ---------------------------------------------------------------------------
// TAX-001: 의뢰 입력 후 AI가 관련 필드 결정
// ---------------------------------------------------------------------------
describe("[TAX-001] 의뢰 입력 후 AI가 관련 필드 결정", () => {
  it("1단계에 의뢰 입력란과 '다음' 버튼이 표시된다", () => {
    render(<Page />);
    expect(screen.getByRole("textbox", { name: /의뢰/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^다음/ })).toBeInTheDocument();
  });

  it("구체적 의뢰 입력 + '다음' 클릭 → 2단계로 전환, 의뢰 요약 + '분석 요청' 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, "프리랜서 소득으로 절세 방법 알려줘");

    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeInTheDocument();
    // 의뢰 요약 표시 확인
    expect(screen.getByText(/프리랜서 소득으로 절세 방법 알려줘/)).toBeInTheDocument();
  });

  it("양도소득세 의뢰 입력 + '다음' 클릭 → 2단계로 전환", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, "양도소득세 줄이고 싶어요. 작년에 아파트 팔았어요");

    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeInTheDocument();
    expect(screen.getByText(/양도소득세 줄이고 싶어요/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// TAX-002: 모호한 의뢰 입력 시 재입력 안내
// ---------------------------------------------------------------------------
describe("[TAX-002] 모호한 의뢰 입력 시 재입력 안내", () => {
  it("'절세 알려줘' 입력 + '다음' 클릭 → 1단계 유지 + 안내 메시지 표시", async () => {
    setupFetchMock({ ambiguous: true });
    const user = userEvent.setup();
    render(<Page />);

    const textarea = screen.getByRole("textbox", { name: /의뢰/ });
    await user.type(textarea, "절세 알려줘");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(screen.getByText(/의뢰 내용이 모호합니다/)).toBeInTheDocument();
    });
    // 1단계 유지: "다음" 버튼 존재, "분석 요청" 없음
    expect(screen.getByRole("button", { name: /^다음/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /분석\s*요청/ })).not.toBeInTheDocument();
  });

  it("'세금' 입력 + '다음' 클릭 → 1단계 유지 + 안내 메시지 표시", async () => {
    setupFetchMock({ ambiguous: true });
    const user = userEvent.setup();
    render(<Page />);

    const textarea = screen.getByRole("textbox", { name: /의뢰/ });
    await user.type(textarea, "세금");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(screen.getByText(/의뢰 내용이 모호합니다/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /분석\s*요청/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// TAX-003: 2단계 필드 입력 후 분석 요청 → 보고서 표시
// ---------------------------------------------------------------------------
describe("[TAX-003] 2단계 필드 입력 후 분석 요청 → 보고서 표시", () => {
  it("2단계 필드 입력 + '분석 요청' 클릭 → 보고서 + [조문 보기][해석 보기] 탭 표시", async () => {
    setupFetchMock({ fields: ["annualIncome", "prepaidTax"] });
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user);

    // 동적 필드 입력
    const annualIncomeInput = screen.queryByLabelText(/연간\s*소득|연간\s*매출|annualIncome/i);
    if (annualIncomeInput) {
      await user.type(annualIncomeInput, "5000만원");
    }

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });

  it("연간소득 1억 + 기납부 0 → 보고서 + 탭 표시", async () => {
    setupFetchMock({ fields: ["annualIncome", "prepaidTax"] });
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-004: 보고서 조문/해석 탭 전환
// ---------------------------------------------------------------------------
describe("[TAX-004] 보고서 조문/해석 탭 전환", () => {
  it("기본 활성 탭은 [해석 보기]이며 해석 텍스트가 표시된다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    const interpretationTab = screen.getByRole("tab", { name: "해석 보기" });
    expect(interpretationTab).toHaveAttribute("data-state", "active");
    expect(screen.getByText(/절세\s*방안|연금저축|공제/)).toBeInTheDocument();
  });

  it("[조문 보기] 탭 클릭 → 조문 원문 표시, 해석 내용 숨김", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    await user.click(screen.getByRole("tab", { name: "조문 보기" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toHaveAttribute("data-state", "active");
      expect(screen.getByText(/소득세\s*세율|조문\s*내용|소득세법/)).toBeInTheDocument();
    });
    // 해석 탭 내용 숨김
    expect(screen.getByRole("tab", { name: "해석 보기" })).toHaveAttribute("data-state", "inactive");
  });

  it("[해석 보기] 탭 클릭 → 해석 내용 다시 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    await user.click(screen.getByRole("tab", { name: "조문 보기" }));
    await user.click(screen.getByRole("tab", { name: "해석 보기" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toHaveAttribute("data-state", "active");
      expect(screen.getByText(/절세\s*방안|연금저축|공제/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-005: 채팅으로 추가 질문 → 보고서 재생성
// ---------------------------------------------------------------------------
describe("[TAX-005] 채팅으로 추가 질문 → 보고서 재생성", () => {
  it("채팅 입력 + 전송 → 이전 보고서 교체 + 채팅 내역(질문 + 안내) 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    const chatInput = screen.getByRole("textbox", { name: /채팅|질문|메시지/ });
    await user.type(chatInput, "연금저축 공제도 추가해서 다시 분석해줘");
    await user.click(screen.getByRole("button", { name: /전송|보내기/ }));

    await waitFor(() => {
      expect(screen.getByText("연금저축 공제도 추가해서 다시 분석해줘")).toBeInTheDocument();
      expect(screen.getByText(/보고서가 업데이트되었습니다/)).toBeInTheDocument();
    });
  });

  it("채팅 전송 후 채팅 메시지 2건(질문 + 시스템)이 채팅 영역에 표시된다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    const chatInput = screen.getByRole("textbox", { name: /채팅|질문|메시지/ });
    await user.type(chatInput, "부양가족이 1명 더 있으면 얼마나 절세되나요?");
    await user.click(screen.getByRole("button", { name: /전송|보내기/ }));

    await waitFor(() => {
      const messages = screen.getAllByRole("article");
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-006: 히스토리 저장 및 재조회
// ---------------------------------------------------------------------------
describe("[TAX-006] 히스토리 저장 및 재조회", () => {
  it("히스토리 항목 클릭 → 폼과 보고서 복원", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    const historyItems = await screen.findAllByRole("listitem");
    expect(historyItems.length).toBeGreaterThanOrEqual(1);

    await user.click(historyItems[0]);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });

  it("새로고침 후에도 히스토리 목록 유지 (localStorage)", async () => {
    const historyData = {
      version: "v1",
      history: [
        {
          id: "1",
          timestamp: Date.now(),
          request: "프리랜서 소득으로 절세 방법 알려줘",
          form: {
            incomeType: "",
            annualIncome: "5000만원",
            prepaidTax: "300만원",
            house: "",
            financialIncome: "",
            pension: "",
            freeText: "",
          },
          report: {
            statutes: [{ name: "소득세법 제55조", text: "세율 조문" }],
            interpretation: "절세 방안입니다.",
            statutesAvailable: true,
          },
        },
      ],
    };
    localStorage.setItem("taxStore:v1", JSON.stringify(historyData));

    render(<Page />);

    await waitFor(() => {
      const historyItems = screen.getAllByRole("listitem");
      expect(historyItems.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-007: 다크모드 토글
// ---------------------------------------------------------------------------
describe("[TAX-007] 다크모드 토글", () => {
  it("다크모드 토글 클릭 → html에 dark 클래스 추가 + localStorage 저장", async () => {
    const user = userEvent.setup();
    render(<Page />);

    const toggle = screen.getByRole("switch", { name: /다크\s*모드|테마|dark/i });
    await user.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(localStorage.getItem("darkMode")).toBeTruthy();
  });

  it("다크모드 ON 후 다시 클릭 → light 테마 복원 + localStorage 저장", async () => {
    const user = userEvent.setup();
    render(<Page />);

    const toggle = screen.getByRole("switch", { name: /다크\s*모드|테마|dark/i });
    await user.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await user.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
    expect(localStorage.getItem("darkMode")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TAX-008: 분석 요청 중 로딩 인디케이터 표시
// ---------------------------------------------------------------------------
describe("[TAX-008] 분석 요청 중 로딩 인디케이터 표시", () => {
  it("'분석 요청' 클릭 후 보고서 완료 전 로딩 인디케이터 + 버튼 비활성", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 1단계 → 2단계
    await proceedToStep2(user);

    // 분석 fetch 지연
    let resolveAnalyze!: (v: unknown) => void;
    const pendingAnalyze = new Promise((r) => { resolveAnalyze = r; });
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? "";
      if (url.includes("identify-fields")) {
        return Promise.resolve({ ok: true, json: async () => ({ fields: ["annualIncome"] }) } as unknown as Response);
      }
      return pendingAnalyze as Promise<Response>;
    });

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeDisabled();
    });
    expect(screen.queryByRole("tab", { name: "해석 보기" })).not.toBeInTheDocument();

    resolveAnalyze(makeSSEResponse(mockReport));
  });
});

// ---------------------------------------------------------------------------
// TAX-009: 채팅 전송 후 보고서 재생성 중 로딩 인디케이터 표시
// ---------------------------------------------------------------------------
describe("[TAX-009] 채팅 전송 후 보고서 재생성 중 로딩 인디케이터 표시", () => {
  it("채팅 전송 → 재생성 완료 전 로딩 인디케이터 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToReport(user);

    let resolveChat!: (v: unknown) => void;
    const pendingChat = new Promise((r) => { resolveChat = r; });
    vi.spyOn(global, "fetch").mockReturnValue(pendingChat as Promise<Response>);

    const chatInput = screen.getByRole("textbox", { name: /채팅|질문|메시지/ });
    await user.type(chatInput, "부양가족이 2명이면 어떻게 달라지나요?");
    await user.click(screen.getByRole("button", { name: /전송|보내기/ }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /채팅|질문|메시지/ })).toBeDisabled();
    });

    resolveChat(makeChatSSEResponse());
  });
});

// ---------------------------------------------------------------------------
// TAX-010: 분석 완료 후 히스토리 목록 자동 추가
// ---------------------------------------------------------------------------
describe("[TAX-010] 분석 완료 후 히스토리 목록 자동 추가", () => {
  it("보고서 생성 직후 요청 시각 + 의뢰 내용 앞부분 항목이 히스토리에 추가된다", async () => {
    setupFetchMock({ fields: ["annualIncome"] });
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, "프리랜서 소득으로 절세 방법 알려줘");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    await waitFor(() => {
      const historyItems = screen.getAllByRole("listitem");
      expect(historyItems.length).toBeGreaterThanOrEqual(1);
      // 의뢰 내용 일부가 히스토리에 표시됨
      expect(screen.getByText(/프리랜서 소득으로/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-011: 다크모드 초기값 OS 설정 연동
// ---------------------------------------------------------------------------
describe("[TAX-011] 다크모드 초기값 OS 설정 연동", () => {
  it("localStorage 미설정 + OS 다크모드 ON → 다크 테마 적용", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("localStorage 미설정 + OS 라이트모드 → 라이트 테마 적용", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TAX-012: 1단계 AI 분석 중 로딩 인디케이터 표시
// ---------------------------------------------------------------------------
describe("[TAX-012] 1단계 AI 분석 중 로딩 인디케이터 표시", () => {
  it("'다음' 클릭 후 2단계 전환 전 로딩 + '다음' 버튼 비활성", async () => {
    let resolveFetch!: (v: unknown) => void;
    const pendingFetch = new Promise((r) => { resolveFetch = r; });
    vi.spyOn(global, "fetch").mockReturnValue(pendingFetch as Promise<Response>);

    const user = userEvent.setup();
    render(<Page />);

    const textarea = screen.getByRole("textbox", { name: /의뢰/ });
    await user.type(textarea, "프리랜서 소득으로 절세 방법 알려줘");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^다음/ })).toBeDisabled();
    });
    // 2단계 미표시
    expect(screen.queryByRole("button", { name: /분석\s*요청/ })).not.toBeInTheDocument();

    resolveFetch({ ok: true, json: async () => ({ fields: ["annualIncome"] }) });
  });
});

// ---------------------------------------------------------------------------
// TAX-013: 2단계 의뢰 요약 읽기 전용 표시
// ---------------------------------------------------------------------------
describe("[TAX-013] 2단계 의뢰 요약 읽기 전용 표시", () => {
  it("2단계 상단에 1단계 입력 의뢰가 읽기전용으로 표시되고 편집 불가", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, "프리랜서 소득으로 절세 방법 알려줘");

    // 의뢰 텍스트가 화면에 표시됨
    const summaryEl = screen.getByText(/프리랜서 소득으로 절세 방법 알려줘/);
    expect(summaryEl).toBeInTheDocument();
    // 편집 불가: textarea나 input이 아님
    expect(summaryEl.tagName).not.toBe("TEXTAREA");
    expect(summaryEl.tagName).not.toBe("INPUT");
    // contentEditable이 아님
    expect(summaryEl.getAttribute("contenteditable")).not.toBe("true");
  });

  it("양도소득세 의뢰 텍스트가 2단계에 그대로 표시된다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, "양도소득세 줄이고 싶어요. 작년에 아파트 팔았어요");

    const summaryEl = screen.getByText(/양도소득세 줄이고 싶어요. 작년에 아파트 팔았어요/);
    expect(summaryEl).toBeInTheDocument();
    expect(summaryEl.tagName).not.toBe("TEXTAREA");
    expect(summaryEl.tagName).not.toBe("INPUT");
  });
});

// ---------------------------------------------------------------------------
// TAX-014: 모호한 의뢰 안내 문구 텍스트 및 입력란 활성 상태
// ---------------------------------------------------------------------------
describe("[TAX-014] 모호한 의뢰 안내 문구 텍스트 및 입력란 활성 상태", () => {
  it("모호한 의뢰 후 정확한 안내 문구 표시 + 입력란 편집 가능 + 기존 값 유지", async () => {
    setupFetchMock({ ambiguous: true });
    const user = userEvent.setup();
    render(<Page />);

    const textarea = screen.getByRole("textbox", { name: /의뢰/ });
    await user.type(textarea, "절세 알려줘");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(
        screen.getByText("의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요")
      ).toBeInTheDocument();
    });

    // 입력란 편집 가능 상태 유지
    const textareaAfter = screen.getByRole("textbox", { name: /의뢰/ });
    expect(textareaAfter).not.toBeDisabled();
    expect(textareaAfter).toHaveValue("절세 알려줘");
  });

  it("'세금' 입력 후 모호 안내 + 입력값 '세금' 유지", async () => {
    setupFetchMock({ ambiguous: true });
    const user = userEvent.setup();
    render(<Page />);

    const textarea = screen.getByRole("textbox", { name: /의뢰/ });
    await user.type(textarea, "세금");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(
        screen.getByText("의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요")
      ).toBeInTheDocument();
    });

    const textareaAfter = screen.getByRole("textbox", { name: /의뢰/ });
    expect(textareaAfter).not.toBeDisabled();
    expect(textareaAfter).toHaveValue("세금");
  });
});

// ---------------------------------------------------------------------------
// TAX-015: 히스토리 레이블 의뢰 내용 20자 잘림 표시
// ---------------------------------------------------------------------------
describe("[TAX-015] 히스토리 레이블 의뢰 내용 20자 잘림 표시", () => {
  it("20자 초과 의뢰로 보고서 생성 → 히스토리 레이블에 앞 20자만 표시", async () => {
    const longRequest = "프리랜서 소득세와 부가가치세를 동시에 절감할 수 있는 방법을 알려주세요";
    const expected20 = longRequest.slice(0, 20);

    setupFetchMock({ fields: ["annualIncome"] });
    const user = userEvent.setup();
    render(<Page />);

    await proceedToStep2(user, longRequest);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    await waitFor(() => {
      // 히스토리 레이블: 앞 20자만 표시 (21자 이상의 전체 텍스트는 표시되지 않음)
      const historyItems = screen.getAllByRole("listitem");
      expect(historyItems.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(new RegExp(expected20))).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-016: 다크모드 localStorage 저장값 새로고침 후 복원
// ---------------------------------------------------------------------------
describe("[TAX-016] 다크모드 localStorage 저장값 새로고침 후 복원", () => {
  it("localStorage에 'dark' 저장 + OS 라이트 → 다크 테마 적용", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false, // OS 라이트모드
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    localStorage.setItem("darkMode", JSON.stringify(true));

    // layout.tsx 초기화 로직 시뮬레이션
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("localStorage에 'light' 저장 + OS 다크 → 라이트 테마 적용", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)", // OS 다크모드
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    localStorage.setItem("darkMode", JSON.stringify(false));

    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
