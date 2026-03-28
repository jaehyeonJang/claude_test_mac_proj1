"use client";

import { useEffect, useRef, useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Send, MessageCircle } from "lucide-react";

export function ChatSection() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);
  const chatHistory = useTaxStore((s) => s.chatHistory);
  const sendChatMessage = useTaxStore((s) => s.sendChatMessage);
  const applyToReport = useTaxStore((s) => s.applyToReport);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  if (!report) return null;

  async function handleSend() {
    const message = input.trim();
    if (!message || isLoading) return;
    setInput("");
    setChatError(null);
    try {
      await sendChatMessage(message);
    } catch {
      setChatError("메시지 전송 중 오류가 발생했습니다.");
    }
  }

  return (
    <section aria-label="채팅" className="flex flex-col rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">추가 논의</h3>
          <p className="text-xs text-muted-foreground">분석 결과에 대해 더 질문하세요</p>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto p-3 max-h-96 min-h-40">
        <div role="log" aria-live="polite" className="flex flex-col gap-2 h-full">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                분석 결과에 대해 궁금한 점을 질문해보세요
              </p>
            </div>
          ) : (
            chatHistory.map((msg) => (
              <article
                key={msg.id}
                className={
                  msg.role === "user"
                    ? "self-end rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[80%]"
                    : "self-start rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm max-w-[80%]"
                }
              >
                <p>{msg.content}</p>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-3 space-y-2 shrink-0">
        <div className="flex gap-2">
          <Input
            aria-label="채팅 메시지"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="분석 결과에 대해 추가로 질문하세요..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="전송"
          >
            {isLoading ? <Spinner /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {chatHistory.some((m) => m.role === "user") && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={async () => {
              setChatError(null);
              try {
                await applyToReport();
              } catch {
                setChatError("보고서 반영 중 오류가 발생했습니다.");
              }
            }}
            disabled={isLoading}
          >
            보고서에 반영
          </Button>
        )}
        {chatError && (
          <p role="alert" className="text-xs text-destructive mt-1">
            {chatError}
          </p>
        )}
      </div>
    </section>
  );
}
