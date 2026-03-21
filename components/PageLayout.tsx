"use client";

import { useEffect, useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { HistorySidebar } from "@/components/HistorySidebar";
import { InputForm } from "@/components/InputForm";
import { ReportView } from "@/components/ReportView";
import { ChatSection } from "@/components/ChatSection";

export function PageLayout() {
  const [showForm, setShowForm] = useState(true);

  // Subscribe to Zustand store as an external system.
  // Hide form when report transitions from null → non-null (analysis complete).
  useEffect(() => {
    return useTaxStore.subscribe((state, prevState) => {
      if (prevState.report === null && state.report !== null) {
        setShowForm(false);
      }
    });
  }, []);

  const handleNewAnalysis = () => {
    useTaxStore.getState().resetAnalysis();
    setShowForm(true);
  };

  return (
    <main className="flex h-screen overflow-hidden" aria-label="세금 절세 도우미">
      <HistorySidebar
        onNewAnalysis={handleNewAnalysis}
        onRestoreHistory={() => setShowForm(false)}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {showForm && <InputForm />}
          <ReportView />
          <ChatSection />
        </div>
      </div>
    </main>
  );
}
