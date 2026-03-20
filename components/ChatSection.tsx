"use client";

import { useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Spinner(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function ChatSection() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);
  const setIsLoading = useTaxStore((s) => s.setIsLoading);
  const setReport = useTaxStore((s) => s.setReport);
  const addChatMessage = useTaxStore((s) => s.addChatMessage);
  const chatHistory = useTaxStore((s) => s.chatHistory);
  const form = useTaxStore((s) => s.form);
  const [input, setInput] = useState("");

  if (!report) return null;

  async function handleSend() {
    const message = input.trim();
    if (!message || isLoading) return;
    setInput("");
    addChatMessage({ role: "user", content: message });
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, freeText: message }),
      });
      const data = await res.json();
      setReport(data);
      addChatMessage({ role: "assistant", content: "보고서가 업데이트되었습니다." });
    } catch {
      // no-op
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-label="채팅">
      <div role="log" aria-live="polite">
        {chatHistory.map((msg, i) => (
          <article key={i}>
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
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading && <Spinner data-icon="inline-start" />}
          전송
        </Button>
      </div>
    </section>
  );
}
