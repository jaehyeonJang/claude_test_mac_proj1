import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InputForm } from "@/components/InputForm";
import { useTaxStore } from "@/lib/store/taxStore";

beforeEach(() => {
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
    isLoading: false,
    error: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InputForm — step 1", () => {
  it("1단계에 의뢰 텍스트에어리어와 '다음' 버튼이 표시된다", () => {
    render(<InputForm />);
    expect(screen.getByRole("textbox", { name: /의뢰/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^다음/ })).toBeInTheDocument();
  });

  it("의뢰가 비어있으면 '다음' 버튼이 비활성", () => {
    render(<InputForm />);
    expect(screen.getByRole("button", { name: /^다음/ })).toBeDisabled();
  });

  it("의뢰 입력 시 '다음' 버튼 활성화", async () => {
    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByRole("textbox", { name: /의뢰/ }), "프리랜서 절세 방법 알려줘");
    expect(screen.getByRole("button", { name: /^다음/ })).not.toBeDisabled();
  });

  it("'다음' 클릭 시 /api/identify-fields 호출", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ fields: ["annualIncome"] }),
    } as unknown as Response);

    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByRole("textbox", { name: /의뢰/ }), "프리랜서 절세 방법");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/identify-fields",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("모호 응답 시 clarificationMessage 표시", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ambiguous: true,
        message: "의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요",
      }),
    } as unknown as Response);

    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByRole("textbox", { name: /의뢰/ }), "절세 알려줘");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(
        screen.getByText("의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요")
      ).toBeInTheDocument();
    });
    // 여전히 1단계 상태
    expect(screen.getByRole("button", { name: /^다음/ })).toBeInTheDocument();
  });

  it("isIdentifying 중 '다음' 버튼 비활성", async () => {
    let resolveIdentify!: (v: unknown) => void;
    const pending = new Promise((r) => { resolveIdentify = r; });
    vi.spyOn(global, "fetch").mockReturnValue(pending as Promise<Response>);

    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByRole("textbox", { name: /의뢰/ }), "프리랜서 절세");
    await user.click(screen.getByRole("button", { name: /^다음/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^다음/ })).toBeDisabled();
    });

    resolveIdentify({ ok: true, json: async () => ({ fields: [] }) });
  });
});

describe("InputForm — step 2", () => {
  beforeEach(() => {
    useTaxStore.setState({
      step: 2,
      request: "프리랜서 소득으로 절세 방법 알려줘",
      dynamicFields: ["annualIncome", "prepaidTax"],
      isIdentifying: false,
      clarificationMessage: null,
    });
  });

  it("2단계에 의뢰 요약과 '분석 요청' 버튼이 표시된다", () => {
    render(<InputForm />);
    expect(screen.getByText(/프리랜서 소득으로 절세 방법 알려줘/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeInTheDocument();
  });

  it("2단계에 AI 결정 필드가 표시된다", () => {
    render(<InputForm />);
    expect(screen.getByLabelText(/연간\s*소득/)).toBeInTheDocument();
    expect(screen.getByLabelText(/기납부세액/)).toBeInTheDocument();
  });

  it("'이전' 클릭 시 step이 1로 복귀", async () => {
    const user = userEvent.setup();
    render(<InputForm />);

    await user.click(screen.getByRole("button", { name: /이전/ }));

    await waitFor(() => {
      expect(useTaxStore.getState().step).toBe(1);
    });
  });

  it("'분석 요청' 클릭 시 /api/analyze 호출", async () => {
    const sseEvents = [
      `data: ${JSON.stringify({ step: "identify" })}\n\n`,
      `data: ${JSON.stringify({ result: { statutes: [], interpretation: "분석 결과" } })}\n\n`,
    ].join("");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(sseEvents));
          c.close();
        },
      }),
    } as unknown as Response);

    const user = userEvent.setup();
    render(<InputForm />);

    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/analyze", expect.anything());
    });
  });
});
