"use client";

import { useTaxStore } from "@/lib/store/taxStore";
import { HistorySidebar } from "@/components/HistorySidebar";
import { InputForm } from "@/components/InputForm";
import { ReportView } from "@/components/ReportView";
import { ChatSection } from "@/components/ChatSection";

export function PageLayout() {
  const handleNewAnalysis = () => {
    useTaxStore.getState().resetAnalysis();
  };

  return (
    <main className="flex h-screen overflow-hidden" aria-label="세금 절세 도우미">
      <HistorySidebar
        onNewAnalysis={handleNewAnalysis}
        onRestoreHistory={() => {}}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          <InputForm />
          <ReportView />
          <ChatSection />
        </div>
      </div>
    </main>
  );
}
