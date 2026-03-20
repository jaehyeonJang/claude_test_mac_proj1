import { HistorySidebar } from "@/components/HistorySidebar";
import { InputForm } from "@/components/InputForm";
import { ReportView } from "@/components/ReportView";
import { ChatSection } from "@/components/ChatSection";
import { Header } from "@/components/Header";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <HistorySidebar />
        <InputForm />
        <ReportView />
        <ChatSection />
      </main>
    </>
  );
}
