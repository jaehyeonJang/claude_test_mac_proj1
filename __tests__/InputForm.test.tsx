import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InputForm } from "@/components/InputForm";
import { useTaxStore } from "@/lib/store/taxStore";

beforeEach(() => {
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
    isLoading: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InputForm", () => {
  it("renders all 7 field labels and freeText label", () => {
    render(<InputForm />);

    expect(screen.getByLabelText(/소득\s*유형/)).toBeInTheDocument();
    expect(screen.getByLabelText(/연간\s*소득/)).toBeInTheDocument();
    expect(screen.getByLabelText(/부양가족/)).toBeInTheDocument();
    expect(screen.getByLabelText(/주택\s*보유/)).toBeInTheDocument();
    expect(screen.getByLabelText(/금융소득/)).toBeInTheDocument();
    expect(screen.getByLabelText(/연금/)).toBeInTheDocument();
    expect(screen.getByLabelText(/기납부세액/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/자유\s*텍스트|추가\s*의뢰|메모/)
    ).toBeInTheDocument();
  });

  it("button is disabled when no inputs", () => {
    render(<InputForm />);
    expect(screen.getByRole("button", { name: /분석\s*요청/ })).toBeDisabled();
  });

  it("button enabled when freeText has value", async () => {
    const user = userEvent.setup();
    render(<InputForm />);

    const freeTextArea = screen.getByLabelText(/자유\s*텍스트/);
    await user.type(freeTextArea, "테스트 입력");

    expect(
      screen.getByRole("button", { name: /분석\s*요청/ })
    ).not.toBeDisabled();
  });

  it("button enabled when any form field has value", async () => {
    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");

    expect(
      screen.getByRole("button", { name: /분석\s*요청/ })
    ).not.toBeDisabled();
  });

  it("submit calls fetch with correct data", async () => {
    const mockResponse = {
      statutes: [{ name: "소득세법", text: "조문" }],
      interpretation: "해석",
    };
    const sseEvents = [
      `data: ${JSON.stringify({ step: "identify" })}\n\n`,
      `data: ${JSON.stringify({ step: "law", lawNames: ["소득세법"] })}\n\n`,
      `data: ${JSON.stringify({ step: "ai" })}\n\n`,
      `data: ${JSON.stringify({ result: mockResponse })}\n\n`,
    ].join("");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sseEvents));
        controller.close();
      },
    });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, body } as unknown as Response);

    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("5000만원"),
      });
    });

    await waitFor(() => {
      const state = useTaxStore.getState();
      expect(state.report).toEqual(mockResponse);
      expect(state.isLoading).toBe(false);
    });
  });

  it("button disabled and isLoading=true during submission", async () => {
    let resolveResponse: (value: unknown) => void;
    const pendingFetch = new Promise((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(global, "fetch").mockReturnValue(
      pendingFetch as Promise<Response>
    );

    const user = userEvent.setup();
    render(<InputForm />);

    await user.type(screen.getByLabelText(/연간\s*소득/), "5000만원");
    await user.click(screen.getByRole("button", { name: /분석\s*요청/ }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /분석\s*요청/ })
      ).toBeDisabled();
      expect(useTaxStore.getState().isLoading).toBe(true);
    });

    resolveResponse!({
      ok: true,
      json: async () => ({
        statutes: [],
        interpretation: "",
      }),
    });
  });
});
