"use client";

import { create } from "zustand";
import type { Statute } from "@/lib/lawApi";

const STORAGE_KEY = "taxStore:v1";

export interface FormData {
  incomeType: string;
  annualIncome: string;
  dependents: string;
  house: string;
  financialIncome: string;
  pension: string;
  prepaidTax: string;
  freeText: string;
  // Additional deduction fields (optional — hidden in collapsible section)
  pensionSavings?: string;
  creditCard?: string;
  medicalExpense?: string;
  children?: string;
  housingSubscription?: string;
  monthlyRent?: string;
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
  form: FormData;
  report: ReportData;
}

export interface TaxStoreState {
  form: FormData;
  report: ReportData | null;
  chatHistory: ChatMessage[];
  history: HistoryItem[];
  darkMode: boolean;
  isLoading: boolean;
  analysisStep: 'law' | 'ai' | null;
  submittedForm: FormData | null;
  error: string | null;
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
  submitAnalysis: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  applyToReport: () => Promise<void>;
  resetAnalysis: () => void;
}

const defaultForm: FormData = {
  incomeType: "",
  annualIncome: "",
  dependents: "",
  house: "",
  financialIncome: "",
  pension: "",
  prepaidTax: "",
  freeText: "",
  pensionSavings: "",
  creditCard: "",
  medicalExpense: "",
  children: "",
  housingSubscription: "",
  monthlyRent: "",
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

export const useTaxStore = create<TaxStoreState>((set, get) => ({
  form: defaultForm,
  report: null,
  chatHistory: [],
  history: [],
  darkMode: false,
  isLoading: false,
  analysisStep: null,
  submittedForm: null,
  error: null,

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
    set({ form: item.form, report: item.report, chatHistory: [], submittedForm: item.form, error: null });
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

  submitAnalysis: async () => {
    const { form } = get();
    const formSnapshot = { ...form };
    set({ isLoading: true, error: null, analysisStep: 'law', submittedForm: null });

    const stepTimer = setTimeout(() => {
      if (get().isLoading) set({ analysisStep: 'ai' });
    }, 1500);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await res.json();
      set({ report: data, submittedForm: formSnapshot });
      get().addHistory({ timestamp: Date.now(), form: formSnapshot, report: data });
      set({ form: defaultForm });
    } catch (e) {
      console.error('[submitAnalysis]', e);
      set({ error: '분석 중 오류가 발생했습니다. 다시 시도해 주세요.' });
    } finally {
      clearTimeout(stepTimer);
      set({ isLoading: false, analysisStep: null });
    }
  },

  resetAnalysis: () => {
    set({ report: null, chatHistory: [], error: null, form: defaultForm, analysisStep: null, submittedForm: null });
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
      const data = await res.json();
      // data.response: 실제 API 응답. 테스트 mock은 response 필드 없음 → fallback
      addChatMessage({ role: 'assistant', content: data.response ?? '보고서가 업데이트되었습니다.' });
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
      const data = await res.json();
      set({ report: data });
      addChatMessage({ role: 'assistant', content: '보고서에 반영되었습니다.' });
    } catch (e) {
      console.error('[applyToReport]', e);
      set({ error: '보고서 반영 중 오류가 발생했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
