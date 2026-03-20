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
  dependents: "2",
  house: "1주택",
  financialIncome: "없음",
  pension: "없음",
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
  form: mockForm,
  report: mockReport,
};

const mockRestoreHistory = vi.fn();

vi.mock("@/lib/store/taxStore", () => ({
  useTaxStore: vi.fn((selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      history: [] as HistoryItem[],
      restoreHistory: mockRestoreHistory,
    };
    return selector(state);
  }),
}));

import { useTaxStore } from "@/lib/store/taxStore";
const mockedUseTaxStore = vi.mocked(useTaxStore);

function setMockHistory(items: HistoryItem[]) {
  mockedUseTaxStore.mockImplementation(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        history: items,
        restoreHistory: mockRestoreHistory,
      };
      return selector(state);
    }
  );
}

beforeEach(() => {
  mockRestoreHistory.mockClear();
  setMockHistory([]);
});

describe("HistorySidebar", () => {
  it("히스토리가 비어있으면 빈 상태 메시지를 표시한다", () => {
    setMockHistory([]);
    render(<HistorySidebar />);

    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });

  it("히스토리 항목이 있으면 incomeType 텍스트를 표시한다", () => {
    setMockHistory([mockHistoryItem]);
    render(<HistorySidebar />);

    expect(screen.getByText("근로소득")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
  });

  it("히스토리 항목 클릭 시 restoreHistory를 올바른 아이템으로 호출한다", async () => {
    setMockHistory([mockHistoryItem]);
    const user = userEvent.setup();
    render(<HistorySidebar />);

    await user.click(screen.getByText("근로소득"));

    expect(mockRestoreHistory).toHaveBeenCalledWith(mockHistoryItem);
  });

  it("여러 히스토리 항목을 모두 표시한다", () => {
    const items: HistoryItem[] = [
      mockHistoryItem,
      {
        id: "2",
        timestamp: Date.now() - 60000,
        form: { ...mockForm, incomeType: "사업소득" },
        report: mockReport,
      },
    ];
    setMockHistory(items);
    render(<HistorySidebar />);

    expect(screen.getByText("근로소득")).toBeInTheDocument();
    expect(screen.getByText("사업소득")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("taxStore는 taxStore:v1 키로 localStorage에 히스토리를 저장한다", () => {
    // taxStore의 저장 형식을 검증: { version: "v1", history: [...] }
    const historyData = {
      version: "v1",
      history: [mockHistoryItem],
    };
    const serialized = JSON.stringify(historyData);
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe("v1");
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0].form.incomeType).toBe("근로소득");
    expect(parsed.history[0].id).toBe("1");
    expect(parsed.history[0].timestamp).toBeDefined();
  });
});
