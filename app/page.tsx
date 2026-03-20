import { HistorySidebar } from "@/components/HistorySidebar";
import { InputForm } from "@/components/InputForm";
import { ReportView } from "@/components/ReportView";
import { ChatSection } from "@/components/ChatSection";
import { Header } from "@/components/Header";

export default function Page() {
  return (
    <>
      <Header />
      <main className="flex h-screen overflow-hidden" aria-label="세금 절세 도우미">
        <HistorySidebar />
        <div className="flex-1 overflow-y-auto flex flex-col">
          <InputForm />
          <ReportView />
          <ChatSection />
        </div>
      </main>
    </>
  );
}
