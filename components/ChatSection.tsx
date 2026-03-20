"use client";

import { useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Send } from "lucide-react";

export function ChatSection() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);
  const setIsLoading = useTaxStore((s) => s.setIsLoading);
  const setReport = useTaxStore((s) => s.setReport);
  const addChatMessage = useTaxStore((s) => s.addChatMessage);
  const chatHistory = useTaxStore((s) => s.chatHistory);
  const form = useTaxStore((s) => s.form);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  if (!report) return null;

  async function handleSend() {
    const message = input.trim();
    if (!message || isLoading) return;
    setChatError(null);
    setInput("");
    addChatMessage({ role: "user", content: message });
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, freeText: message }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      const data = await res.json();
      setReport(data);
      addChatMessage({ role: "assistant", content: "보고서가 업데이트되었습니다." });
    } catch {
      setChatError("메시지 전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-label="채팅">
      <div role="log" aria-live="polite" className="flex flex-col gap-2">
        {chatHistory.map((msg) => (
          <article
            key={msg.id}
            className={msg.role === "user"
              ? "self-end rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[80%]"
              : "self-start rounded-lg bg-muted px-3 py-2 text-sm max-w-[80%]"
            }
          >
            <p>{msg.content}</p>
          </article>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          aria-label="채팅 메시지"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()} aria-label="전송">
          {isLoading ? <Spinner /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {chatError && (
        <p role="alert" className="text-xs text-destructive">{chatError}</p>
      )}
    </section>
  );
}
