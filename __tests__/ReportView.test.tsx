import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportView } from "@/components/ReportView";
import { useTaxStore } from "@/lib/store/taxStore";

vi.mock("@/lib/store/taxStore", () => ({
  useTaxStore: vi.fn(),
}));

const mockedUseTaxStore = vi.mocked(useTaxStore);

const mockReport = {
  statutes: [
    { name: "소득세법 제55조", text: "소득세 세율 관련 조문 내용입니다." },
  ],
  interpretation: "근로소득자 절세 방안: 연금저축, 주택청약 공제를 활용하세요.",
};

function setupStore(overrides: { report?: typeof mockReport | null; isLoading?: boolean } = {}) {
  const state = { report: null, isLoading: false, ...overrides };
  mockedUseTaxStore.mockImplementation((selector: unknown) => {
    if (typeof selector === "function") {
      return (selector as (s: typeof state) => unknown)(state);
    }
    return state;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportView", () => {
  it("report가 null이고 로딩 중이 아니면 아무것도 렌더링하지 않는다", () => {
    setupStore({ report: null, isLoading: false });
    const { container } = render(<ReportView />);
    expect(container.innerHTML).toBe("");
  });

  it("isLoading이 true이면 Skeleton 플레이스홀더를 표시한다", () => {
    setupStore({ isLoading: true });
    render(<ReportView />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(3);
  });

  it("report가 존재하면 '해석 보기' 탭이 기본 활성 상태이다", () => {
    setupStore({ report: mockReport });
    render(<ReportView />);
    const interpretationTab = screen.getByRole("tab", { name: "해석 보기" });
    expect(interpretationTab).toHaveAttribute("data-state", "active");
  });

  it("'조문 보기' 탭 클릭 시 조문 텍스트를 표시한다", async () => {
    setupStore({ report: mockReport });
    const user = userEvent.setup();
    render(<ReportView />);

    await user.click(screen.getByRole("tab", { name: "조문 보기" }));

    expect(screen.getByRole("tab", { name: "조문 보기" })).toHaveAttribute(
      "data-state",
      "active"
    );
    expect(screen.getByText("소득세법 제55조")).toBeInTheDocument();
    expect(screen.getByText("소득세 세율 관련 조문 내용입니다.")).toBeInTheDocument();
  });

  it("'해석 보기' 탭 클릭 시 해석 텍스트를 표시한다", async () => {
    setupStore({ report: mockReport });
    const user = userEvent.setup();
    render(<ReportView />);

    // Switch to statutes first, then back
    await user.click(screen.getByRole("tab", { name: "조문 보기" }));
    await user.click(screen.getByRole("tab", { name: "해석 보기" }));

    expect(screen.getByRole("tab", { name: "해석 보기" })).toHaveAttribute(
      "data-state",
      "active"
    );
    expect(
      screen.getByText(/근로소득자 절세 방안/)
    ).toBeInTheDocument();
  });
});
