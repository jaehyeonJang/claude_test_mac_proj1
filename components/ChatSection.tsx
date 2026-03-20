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
  const chatHistory = useTaxStore((s) => s.chatHistory);
  const sendChatMessage = useTaxStore((s) => s.sendChatMessage);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);

  if (!report) return null;

  async function handleSend() {
    const message = input.trim();
    if (!message || isLoading) return;
    setInput("");
    setChatError(null);
    try {
      await sendChatMessage(message);
    } catch (e) {
      setChatError("메시지 전송 중 오류가 발생했습니다.");
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
