"use client";

import { create } from "zustand";
import type { Statute } from "@/lib/lawApi";

const STORAGE_KEY = "taxStore:v1";

export interface FormData {
  // 소득 유형 (다중 선택)
  incomeTypes?: string[];      // 선택된 소득 유형 목록 (신규)
  incomeType: string;          // 하위호환용 (spec 테스트 setState 호환)
  incomeType2?: string;        // 하위호환용
  annualIncome: string;
  prepaidTax: string;
  // 자산 현황
  house: string;
  financialIncome: string;     // 2000만원 기준
  pension: string;
  retirementIncome?: string;   // 하위호환용
  // 부양가족 상세
  childDependents?: string;    // 직계비속 20세 이하 (label: 부양가족)
  spouseDependents?: string;   // 배우자 공제
  elderDependents60?: string;  // 직계존속 60세 이상
  elderDependents70?: string;  // 직계존속 70세 이상 (경로우대)
  // 자유텍스트
  freeText: string;
  // 추가 공제 항목 (optional)
  pensionSavingsAmount?: string; // 연금저축 (최대 600만원)
  irpAmount?: string;            // IRP (합산 900만원 한도)
  creditCard?: string;
  medicalExpense?: string;
  educationExpense?: string;
  insurancePremium?: string;
  donation?: string;
  housingSubscription?: string;
  monthlyRent?: string;
  smbEmployeeReduction?: string;
  // 양도소득 전용 필드
  capitalGainAssetType?: string;       // 자산 종류 (부동산/주식·펀드/기타)
  capitalGainAcquisitionDate?: string; // 취득일
  capitalGainTransferDate?: string;    // 양도일
  capitalGainAcquisitionPrice?: string;// 취득가액
  capitalGainTransferPrice?: string;   // 양도가액
  capitalGainExpenses?: string;        // 필요경비
  capitalGainAdjustedZone?: string;    // 조정대상지역 여부
  // 퇴직소득 전용 필드
  retirementAmount?: string;           // 퇴직급여 총액
  retirementYearsOfService?: string;   // 근속연수
  retirementIsExecutive?: string;      // 임원 여부
  retirementIrpRollover?: string;      // IRP 이연 수령
  retirementHasInterimSettlement?: string; // 중간정산 이력
  // 사업소득 전용 필드
  businessIndustry?: string;           // 업종
  businessExpenseRateType?: string;    // 경비율 유형
  businessRevenue?: string;            // 매출액
  businessPurchaseExpense?: string;    // 매입비용
  businessRentExpense?: string;        // 임차료
  businessLaborExpense?: string;       // 인건비
  // 기타소득 전용 필드
  otherIncomeCategory?: string;        // 소득 종류
  otherIncomeTaxType?: string;         // 과세 방식
  // 증여세 전용 필드
  giftAssetType?: string;              // 증여 재산 종류 (토지, 건물, 현금, 주식 등)
  giftAmount?: string;                 // 증여 재산가액
  giftRelationship?: string;           // 증여자와의 관계
  giftPriorAmount10Y?: string;         // 10년 내 사전 증여 합산액
  giftDate?: string;                   // 증여 예정일
  // 상속세 전용 필드
  inheritanceAmount?: string;          // 상속 재산 총액
  inheritanceDebt?: string;            // 채무·장례비 공제
  inheritanceSpouse?: string;          // 배우자 상속 여부
  // 하위호환 (spec 테스트 setState 호환)
  dependents?: string;
  pensionSavings?: string;
  children?: string;
}

export type { Statute };

export interface ReportData {
  statutes: Statute[];
  interpretation: string;
  statutesAvailable?: boolean;
  statutesSkipped?: boolean; // true when LAW_GO_KR_API_KEY is not configured
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  request: string;
  form: FormData;
  report: ReportData;
}

export interface TaxStoreState {
  // 2단계 플로우 상태
  step: 1 | 2;
  request: string;
  dynamicFields: string[];
  isIdentifying: boolean;
  clarificationMessage: string | null;
  // 기존 상태
  form: FormData;
  report: ReportData | null;
  chatHistory: ChatMessage[];
  history: HistoryItem[];
  darkMode: boolean;
  isLoading: boolean;
  analysisStep: 'identify' | 'law' | 'ai' | null;
  submittedForm: FormData | null;
  error: string | null;
  setRequest: (request: string) => void;
  setForm: (form: Partial<FormData>) => void;
  setReport: (report: ReportData | null) => void;
  addChatMessage: (message: Omit<ChatMessage, "id">) => void;
  clearChatHistory: () => void;
  addHistory: (item: Omit<HistoryItem, "id">) => void;
  initHistory: (items: HistoryItem[]) => void;
  restoreHistory: (item: HistoryItem) => void;
  removeHistory: (id: string) => void;
  setDarkMode: (darkMode: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  submitIdentifyFields: () => Promise<void>;
  goBackToStep1: () => void;
  submitAnalysis: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  applyToReport: () => Promise<void>;
  resetAnalysis: () => void;
}

const defaultForm: FormData = {
  incomeTypes: [],
  incomeType: "",
  annualIncome: "",
  prepaidTax: "",
  house: "",
  financialIncome: "",
  pension: "",
  childDependents: "",
  spouseDependents: "",
  elderDependents60: "",
  elderDependents70: "",
  freeText: "",
  pensionSavingsAmount: "",
  irpAmount: "",
  creditCard: "",
  medicalExpense: "",
  educationExpense: "",
  insurancePremium: "",
  donation: "",
  housingSubscription: "",
  monthlyRent: "",
  smbEmployeeReduction: "",
};

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed.history) ? parsed.history : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "v1", history }));
  } catch {}
}

async function readSSEResult(res: Response): Promise<Record<string, unknown>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const event = JSON.parse(line.slice(6));
      if (event.result) return event.result;
      if (event.error) throw new Error(event.error);
    }
  }
  return {};
}

export const useTaxStore = create<TaxStoreState>((set, get) => ({
  // 2단계 플로우 초기 상태
  step: 1,
  request: "",
  dynamicFields: [],
  isIdentifying: false,
  clarificationMessage: null,
  // 기존 초기 상태
  form: defaultForm,
  report: null,
  chatHistory: [],
  history: [],
  darkMode: false,
  isLoading: false,
  analysisStep: null,
  submittedForm: null,
  error: null,

  setRequest: (request) => set({ request }),

  setForm: (partial) =>
    set((state) => ({ form: { ...state.form, ...partial } })),

  setReport: (report) => set({ report }),

  addChatMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, { ...message, id: crypto.randomUUID() }],
    })),

  clearChatHistory: () => set({ chatHistory: [] }),

  initHistory: (items) => set({ history: items }),

  addHistory: (item) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    const next = [newItem, ...get().history].slice(0, 50);
    set({ history: next });
    saveHistory(next);
  },

  restoreHistory: (item) => {
    set({ form: item.form, report: item.report, chatHistory: [], submittedForm: item.form, error: null, step: 2, request: item.request ?? "" });
  },

  removeHistory: (id) => {
    const next = get().history.filter((item) => item.id !== id);
    set({ history: next });
    saveHistory(next);
  },

  setDarkMode: (darkMode) => {
    set({ darkMode });
    try {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch {}
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  submitIdentifyFields: async () => {
    const { request } = get();
    set({ isIdentifying: true, clarificationMessage: null, error: null });
    try {
      const res = await fetch('/api/identify-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await res.json();
      if (data.ambiguous) {
        set({ clarificationMessage: data.message ?? '의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요' });
      } else {
        set({ dynamicFields: data.fields ?? [], step: 2, clarificationMessage: null });
      }
    } catch (e) {
      console.error('[submitIdentifyFields]', e);
      set({ error: '필드 결정 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    } finally {
      set({ isIdentifying: false });
    }
  },

  goBackToStep1: () => {
    set({ step: 1, dynamicFields: [], clarificationMessage: null, error: null });
  },

  submitAnalysis: async () => {
    const { form, request } = get();
    // request를 freeText로 병합: 사용자 의뢰 내용을 분석 API에 전달
    const formWithRequest = { ...form, freeText: form.freeText || request };
    const formSnapshot = { ...formWithRequest };
    set({ isLoading: true, error: null, analysisStep: 'identify', submittedForm: null });

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formWithRequest),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.step) {
              set({ analysisStep: event.step });
            } else if (event.result) {
              const report = event.result as ReportData;
              set({ report, submittedForm: formSnapshot });
              get().addHistory({ timestamp: Date.now(), request, form: formSnapshot, report });
              set({ form: defaultForm });
            } else if (event.error) {
              const detail = event.detail ? ` (${event.detail})` : '';
              console.error('[analyze] server error:', event.error, event.detail);
              throw new Error(event.error + detail);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      console.error('[submitAnalysis]', e);
      set({ error: '분석 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    } finally {
      set({ isLoading: false, analysisStep: null });
    }
  },

  resetAnalysis: () => {
    set({ report: null, chatHistory: [], error: null, form: defaultForm, analysisStep: null, submittedForm: null, step: 1, request: "", dynamicFields: [], clarificationMessage: null, isIdentifying: false });
  },

  sendChatMessage: async (message: string) => {
    const { form, report, addChatMessage } = get();
    const historySnapshot = get().chatHistory;
    addChatMessage({ role: 'user', content: message });
    set({ isLoading: true });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: report?.interpretation ?? '',
          chatHistory: historySnapshot,
          message,
          formData: form,
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await readSSEResult(res);
      addChatMessage({ role: 'assistant', content: (data.response as string) ?? '보고서가 업데이트되었습니다.' });
    } catch (e) {
      console.error('[sendChatMessage]', e);
      throw new Error('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      set({ isLoading: false });
    }
  },

  applyToReport: async () => {
    const { form, chatHistory, addChatMessage } = get();
    set({ isLoading: true, error: null });
    try {
      const chatContext = chatHistory
        .slice(-10)
        .map((m) => `${m.role === 'user' ? '사용자' : '어시스턴트'}: ${m.content.slice(0, 500)}`)
        .join('\n');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, chatMessage: chatContext }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await readSSEResult(res);
      set({ report: data as unknown as ReportData });
      addChatMessage({ role: 'assistant', content: '보고서에 반영되었습니다.' });
    } catch (e) {
      console.error('[applyToReport]', e);
      set({ error: '보고서 반영 중 오류가 발생했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
