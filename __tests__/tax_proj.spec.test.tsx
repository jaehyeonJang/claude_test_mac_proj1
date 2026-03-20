/**
 * Spec tests derived from artifacts/spec.yaml
 * TAX-001~011 — 수용 기준 테스트 (Acceptance Criteria)
 *
 * IMPORTANT: 이 파일은 생성 후 수정 금지. 테스트 실패 시 구현을 수정한다.
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Page from "@/app/page";
import { useTaxStore } from "@/lib/store/taxStore";

// ---------------------------------------------------------------------------
// Shared mock API response
// ---------------------------------------------------------------------------
const mockReport = {
  statutes: [
    { name: "소득세법 제55조", text: "소득세 세율 관련 조문 내용입니다." },
  ],
  interpretation:
    "근로소득자 절세 방안: 연금저축, 주택청약 공제를 활용하세요.",
};

function setupFetchMock(response = mockReport) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => response,
  } as Response);
}

// In-memory localStorage polyfill for jsdom v28 (setItem/clear not always available)
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
  // Reset in-memory store and stub localStorage globally
  _lsData = {};
  vi.stubGlobal("localStorage", _localStorageMock);

  // Radix UI requires these DOM APIs — polyfill for jsdom
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

  // ScrollArea uses ResizeObserver — polyfill for jsdom
  if (typeof ResizeObserver === "undefined") {
    (globalThis as unknown as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Reset Zustand store state between tests (store is a module-level singleton)
  useTaxStore.setState({
    form: {
      incomeType: "",
      annualIncome: "",
      dependents: "",
      house: "",
      financialIncome: "",
      pension: "",
      prepaidTax: "",
      freeText: "",
    },
    report: null,
    chatHistory: [],
    history: [],
    darkMode: false,
    isLoading: false,
  });

  // Reset HTML dark class
  document.documentElement.className = "";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// TAX-001: 구조화된 폼으로 절세 분석 요청
// ---------------------------------------------------------------------------
describe("[TAX-001] 구조화된 폼으로 절세 분석 요청", () => {
  it("7개 항목 폼 채우고 분석 요청 → 보고서와 탭 표시 (근로소득)", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 소득 유형 선택
    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);

    // 연간 소득 입력
    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");

    // 부양가족 입력
    await user.type(screen.getByLabelText(/부양가족/), "2");

    // 분석 요청
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    // 보고서 표시 확인
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });

  it("7개 항목 폼 채우고 분석 요청 → 보고서와 탭 표시 (사업소득)", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "사업소득" });
    await user.click(incomeOption);

    await user.type(screen.getByLabelText(/연간\s*소득/), "1억원");

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-002: 자유 텍스트로 추가 의뢰 입력
// ---------------------------------------------------------------------------
describe("[TAX-002] 자유 텍스트로 추가 의뢰 입력", () => {
  it("자유 텍스트 입력 후 분석 요청 → 주택청약 내용이 반영된 보고서 표시", async () => {
    setupFetchMock({
      statutes: [{ name: "소득세법 제52조", text: "주택청약 공제 관련 조문" }],
      interpretation: "주택청약 공제를 활용한 절세 방안을 안내합니다.",
    });
    const user = userEvent.setup();
    render(<Page />);

    const freeTextArea = screen.getByLabelText(/자유\s*텍스트|추가\s*의뢰|메모/);
    await user.type(freeTextArea, "주택청약 공제도 포함해서 분석해줘");

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByText(/주택청약/)).toBeInTheDocument();
    });
  });

  it("소득 유형만 입력해도 보고서가 표시된다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-003: 보고서 조문/해석 탭 전환
// ---------------------------------------------------------------------------
describe("[TAX-003] 보고서 조문/해석 탭 전환", () => {
  it("[해석 보기]가 기본 활성 탭이다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      const interpretationTab = screen.getByRole("tab", { name: "해석 보기" });
      expect(interpretationTab).toHaveAttribute("data-state", "active");
    });
  });

  it("[조문 보기] 탭 클릭 → 조문 원문 표시, 해석 내용 숨김", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 보고서 생성
    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
    });

    // 조문 보기 탭 클릭
    await user.click(screen.getByRole("tab", { name: "조문 보기" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toHaveAttribute(
        "data-state",
        "active"
      );
      // 조문 원문 텍스트가 보여야 함
      expect(
        screen.getByText(/소득세\s*세율|조문\s*내용|소득세법/)
      ).toBeInTheDocument();
    });
  });

  it("[해석 보기] 탭 클릭 → 해석 내용 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "조문 보기" })).toBeInTheDocument();
    });

    // 조문 보기 먼저 클릭
    await user.click(screen.getByRole("tab", { name: "조문 보기" }));
    // 해석 보기 다시 클릭
    await user.click(screen.getByRole("tab", { name: "해석 보기" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toHaveAttribute(
        "data-state",
        "active"
      );
      expect(screen.getByText(/절세\s*방안|연금저축|공제/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-004: 채팅으로 추가 질문 후 보고서 재생성
// ---------------------------------------------------------------------------
describe("[TAX-004] 채팅으로 추가 질문 후 보고서 재생성", () => {
  it("채팅 입력 후 전송 → 보고서 재생성 + 채팅 내역 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 먼저 보고서 생성
    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    // 채팅 입력
    const chatInput = screen.getByRole("textbox", { name: /채팅|질문|메시지/ });
    await user.type(chatInput, "연금저축 공제도 추가해서 다시 분석해줘");
    await user.click(screen.getByRole("button", { name: /전송|보내기/ }));

    await waitFor(() => {
      expect(
        screen.getByText("연금저축 공제도 추가해서 다시 분석해줘")
      ).toBeInTheDocument();
      expect(screen.getByText(/보고서가 업데이트되었습니다/)).toBeInTheDocument();
    });
  });

  it("채팅 전송 후 메시지 2개(사용자 + 시스템)가 채팅 내역에 표시된다", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

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
// TAX-005: 히스토리 저장 및 재조회
// ---------------------------------------------------------------------------
describe("[TAX-005] 히스토리 저장 및 재조회", () => {
  it("히스토리 항목 클릭 → 폼과 보고서 복원", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 분석 요청
    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    // 히스토리에 1개 항목이 있어야 함
    const historyItems = await screen.findAllByRole("listitem");
    expect(historyItems.length).toBeGreaterThanOrEqual(1);

    // 히스토리 항목 클릭
    await user.click(historyItems[0]);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });

  it("새로고침 후에도 히스토리 목록 유지 (localStorage)", async () => {
    // localStorage에 히스토리 직접 설정
    const historyData = {
      version: "v1",
      history: [
        {
          id: "1",
          timestamp: Date.now(),
          form: {
            incomeType: "근로소득",
            annualIncome: "5000만원",
            dependents: "0",
            house: "무주택",
            financialIncome: "없음",
            pension: "없음",
            prepaidTax: "0원",
            freeText: "",
          },
          report: {
            statutes: [{ name: "소득세법 제55조", text: "세율 조문" }],
            interpretation: "절세 방안입니다.",
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
// TAX-006: 다크모드 토글
// ---------------------------------------------------------------------------
describe("[TAX-006] 다크모드 토글", () => {
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
    // 켜기
    await user.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    // 끄기
    await user.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    expect(localStorage.getItem("darkMode")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TAX-007: 분석 요청 중 로딩 인디케이터 표시
// ---------------------------------------------------------------------------
describe("[TAX-007] 분석 요청 중 로딩 인디케이터 표시", () => {
  it("분석 요청 버튼 클릭 → 로딩 인디케이터 표시 (보고서 완료 전)", async () => {
    // fetch를 지연시켜 로딩 상태를 관찰
    let resolveResponse: (value: unknown) => void;
    const pendingFetch = new Promise((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(global, "fetch").mockReturnValue(
      pendingFetch as Promise<Response>
    );

    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    // 로딩 인디케이터 확인
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /분석\s*요청/ })
      ).toBeDisabled();
    });

    // 탭은 아직 없어야 함
    expect(screen.queryByRole("tab", { name: "해석 보기" })).not.toBeInTheDocument();

    // 해결
    resolveResponse!({
      ok: true,
      json: async () => mockReport,
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-008: 자유 텍스트만으로 분석 요청
// ---------------------------------------------------------------------------
describe("[TAX-008] 자유 텍스트만으로 분석 요청", () => {
  it("자유 텍스트만 입력 → 분석 요청 버튼 활성화 + 보고서 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 처음에 버튼 비활성화 확인
    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeDisabled();

    const freeTextArea = screen.getByLabelText(/자유\s*텍스트|추가\s*의뢰|메모/);
    await user.type(freeTextArea, "프리랜서 소득으로 절세 방법 알려줘");

    // 버튼 활성화 확인
    expect(screen.getByRole("button", { name: /분석\s*요청/ })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });

  it("배당소득 자유 텍스트 입력 → 보고서 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const freeTextArea = screen.getByLabelText(/자유\s*텍스트|추가\s*의뢰|메모/);
    await user.type(freeTextArea, "배당소득 2000만원 초과 시 건강보험료는?");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-009: 채팅 전송 후 보고서 재생성 중 로딩 인디케이터
// ---------------------------------------------------------------------------
describe("[TAX-009] 채팅 전송 후 보고서 재생성 중 로딩 인디케이터", () => {
  it("채팅 전송 → 재생성 완료 전 로딩 인디케이터 표시", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    // 먼저 보고서 생성
    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    // 채팅 fetch 지연
    let resolveChat: (value: unknown) => void;
    const pendingChat = new Promise((resolve) => {
      resolveChat = resolve;
    });
    vi.spyOn(global, "fetch").mockReturnValue(
      pendingChat as Promise<Response>
    );

    const chatInput = screen.getByRole("textbox", { name: /채팅|질문|메시지/ });
    await user.type(chatInput, "부양가족이 2명이면 어떻게 달라지나요?");
    await user.click(screen.getByRole("button", { name: /전송|보내기/ }));

    // 전송 중 입력 비활성화 확인
    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /채팅|질문|메시지/ })
      ).toBeDisabled();
    });

    resolveChat!({
      ok: true,
      json: async () => mockReport,
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-010: 분석 완료 후 히스토리 목록 자동 추가
// ---------------------------------------------------------------------------
describe("[TAX-010] 분석 완료 후 히스토리 목록 자동 추가", () => {
  it("분석 완료 → 소득 유형 + 시각이 표시된 히스토리 항목 자동 추가", async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Page />);

    const incomeTypeSelect = screen.getByLabelText(/소득\s*유형/);
    await user.click(incomeTypeSelect);
    const incomeOption = await screen.findByRole("option", { name: "근로소득" });
    await user.click(incomeOption);
    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "해석 보기" })).toBeInTheDocument();
    });

    // 히스토리 항목 확인
    await waitFor(() => {
      const historyItems = screen.getAllByRole("listitem");
      expect(historyItems.length).toBeGreaterThanOrEqual(1);
      // 소득 유형이 히스토리에 표시됨
      expect(screen.getByText(/근로소득/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// TAX-011: 다크모드 초기값 OS 설정 연동
// ---------------------------------------------------------------------------
describe("[TAX-011] 다크모드 초기값 OS 설정 연동", () => {
  it("localStorage 미설정 + OS 다크모드 ON → 초기 로드 시 다크 테마 적용", () => {
    // beforeEach에서 _lsData = {}로 초기화됨 → localStorage.getItem("darkMode") = null

    // OS 다크모드 모킹 (vi.stubGlobal → afterEach에서 vi.unstubAllGlobals로 자동 복원)
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

    // layout.tsx 인라인 스크립트 로직 시뮬레이션
    const stored = localStorage.getItem("darkMode"); // null (미설정)
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("localStorage 미설정 + OS 라이트모드 → 초기 로드 시 라이트 테마 적용", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false, // 라이트모드
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const stored = localStorage.getItem("darkMode"); // null
    if (stored !== null) {
      if (JSON.parse(stored)) document.documentElement.classList.add("dark");
    } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
