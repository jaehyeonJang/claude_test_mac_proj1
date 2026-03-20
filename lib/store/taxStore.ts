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
}

export type { Statute };

export interface ReportData {
  statutes: Statute[];
  interpretation: string;
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
  error: string | null;
  setForm: (form: Partial<FormData>) => void;
  setReport: (report: ReportData | null) => void;
  addChatMessage: (message: Omit<ChatMessage, "id">) => void;
  clearChatHistory: () => void;
  addHistory: (item: Omit<HistoryItem, "id">) => void;
  initHistory: (items: HistoryItem[]) => void;
  restoreHistory: (item: HistoryItem) => void;
  setDarkMode: (darkMode: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
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
  history: typeof window !== "undefined" ? loadHistory() : [],
  darkMode: (() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("darkMode");
      if (stored !== null) return JSON.parse(stored) as boolean;
      return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  })(),
  isLoading: false,
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

  setError: (error) => set({ error }),
}));
