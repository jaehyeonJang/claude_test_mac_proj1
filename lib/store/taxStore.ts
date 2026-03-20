"use client";

import { create } from "zustand";

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
}

export interface Statute {
  name: string;
  text: string;
}

export interface ReportData {
  statutes: Statute[];
  interpretation: string;
}

export interface ChatMessage {
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
  setForm: (form: Partial<FormData>) => void;
  setReport: (report: ReportData | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  addHistory: (item: Omit<HistoryItem, "id">) => void;
  restoreHistory: (item: HistoryItem) => void;
  setDarkMode: (darkMode: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
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
};

export function loadHistory(): HistoryItem[] {
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
  history: typeof window !== "undefined" ? loadHistory() : [],
  darkMode: false,
  isLoading: false,

  setForm: (partial) =>
    set((state) => ({ form: { ...state.form, ...partial } })),

  setReport: (report) => set({ report }),

  addChatMessage: (message) =>
    set((state) => ({ chatHistory: [...state.chatHistory, message] })),

  clearChatHistory: () => set({ chatHistory: [] }),

  addHistory: (item) => {
    const newItem: HistoryItem = {
      ...item,
      id: String(Date.now()),
    };
    const next = [newItem, ...get().history].slice(0, 50);
    set({ history: next });
    saveHistory(next);
  },

  restoreHistory: (item) => {
    set({ form: item.form, report: item.report, chatHistory: [] });
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
}));
