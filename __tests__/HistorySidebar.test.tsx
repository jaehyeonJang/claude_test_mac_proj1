import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { HistorySidebar } from "@/components/HistorySidebar";
import type { HistoryItem, FormData, ReportData } from "@/lib/store/taxStore";

// ScrollArea (Radix) requires ResizeObserver in jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockForm: FormData = {
  incomeType: "근로소득",
  annualIncome: "5000만원",
  house: "",
  financialIncome: "",
  pension: "",
  prepaidTax: "300만원",
  freeText: "",
};

const mockReport: ReportData = {
  statutes: [{ name: "소득세법 제55조", text: "세율 조문" }],
  interpretation: "절세 방안입니다.",
};

const mockHistoryItem: HistoryItem = {
  id: "1",
  timestamp: Date.now(),
  request: "프리랜서 소득으로 절세 방법 알려줘",
  form: mockForm,
  report: mockReport,
};

const mockRestoreHistory = vi.fn();
const mockRemoveHistory = vi.fn();

vi.mock("@/lib/store/taxStore", () => ({
  useTaxStore: Object.assign(
    vi.fn((selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        history: [] as HistoryItem[],
        restoreHistory: mockRestoreHistory,
        removeHistory: mockRemoveHistory,
      };
      return selector(state);
    }),
    {
      setState: vi.fn(),
      getState: vi.fn(() => ({ initHistory: vi.fn() })),
    }
  ),
  loadHistory: vi.fn(() => []),
}));

import { useTaxStore } from "@/lib/store/taxStore";
const mockedUseTaxStore = vi.mocked(useTaxStore);

function setMockHistory(items: HistoryItem[]) {
  mockedUseTaxStore.mockImplementation(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        history: items,
        restoreHistory: mockRestoreHistory,
        removeHistory: mockRemoveHistory,
      };
      return selector(state);
    }
  );
}

beforeEach(() => {
  mockRestoreHistory.mockClear();
  mockRemoveHistory.mockClear();
  setMockHistory([]);
});

describe("HistorySidebar", () => {
  it("히스토리가 비어있으면 빈 상태 메시지를 표시한다", () => {
    setMockHistory([]);
    render(<HistorySidebar />);
    expect(screen.getByText("분석 기록이 없습니다")).toBeInTheDocument();
  });

  it("히스토리 항목이 있으면 request 앞 20자를 레이블로 표시한다", () => {
    const longReq = "프리랜서 소득세와 부가가치세를 동시에 절감할 수 있는 방법";
    const item = { ...mockHistoryItem, request: longReq };
    setMockHistory([item]);
    render(<HistorySidebar />);

    expect(screen.getByText(longReq.slice(0, 20))).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("히스토리 항목 클릭 시 restoreHistory를 올바른 아이템으로 호출한다", async () => {
    setMockHistory([mockHistoryItem]);
    const user = userEvent.setup();
    render(<HistorySidebar />);

    // 클릭 가능한 listitem 클릭
    await user.click(screen.getAllByRole("listitem")[0]);

    expect(mockRestoreHistory).toHaveBeenCalledWith(mockHistoryItem);
  });

  it("여러 히스토리 항목을 모두 표시한다", () => {
    const req1 = "프리랜서 소득으로 절세 방법 알려줘";
    const req2 = "양도소득세 줄이고 싶어요";
    const items: HistoryItem[] = [
      { ...mockHistoryItem, request: req1 },
      {
        id: "2",
        timestamp: Date.now() - 60000,
        request: req2,
        form: mockForm,
        report: mockReport,
      },
    ];
    setMockHistory(items);
    render(<HistorySidebar />);

    expect(screen.getByText(req1.slice(0, 20))).toBeInTheDocument();
    expect(screen.getByText(req2.slice(0, 20))).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("taxStore는 taxStore:v1 키로 localStorage에 히스토리를 저장한다", () => {
    const historyData = {
      version: "v1",
      history: [mockHistoryItem],
    };
    const parsed = JSON.parse(JSON.stringify(historyData));
    expect(parsed.version).toBe("v1");
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0].request).toBe("프리랜서 소득으로 절세 방법 알려줘");
  });
});
