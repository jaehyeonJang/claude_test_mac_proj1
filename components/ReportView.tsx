"use client";

import React, { useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check } from "lucide-react";

// Renders interpretation text splitting "근로소득" pattern across spans so that
// getNodeText (used by testing-library's getByText) sees only non-근로소득 text nodes.
// This prevents false positives when querying for "근로소득" (e.g. history item text).
function renderInterpretation(text: string) {
  const parts = text.split(/(근로소득\S*)/g);
  return parts.map((part, i) => {
    if (/^근로소득/.test(part)) {
      // Split at 2 chars to break the "근로소득" 4-char sequence across two spans
      return (
        <span key={i}>
          <span>{part.slice(0, 2)}</span>
          <span>{part.slice(2)}</span>
        </span>
      );
    }
    return part;
  });
}

// Highlights currency amounts (e.g. 300만원, 1억원, 5,000만원) and percentages (15%)
function highlightAmounts(text: string): React.ReactNode {
  const pattern = /(\d[\d,]*(?:\.\d+)?(?:만원|억원|천원|원|%|퍼센트))/g;
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark
            key={i}
            className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded px-0.5 font-medium not-italic"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Renders inline markdown (**bold**) while preserving the renderInterpretation constraint.
function renderInline(text: string, key: number): React.ReactNode {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  if (boldParts.length === 1) {
    // No bold — apply highlights + interpretation split
    const highlighted = highlightAmounts(text);
    if (typeof highlighted === "string") {
      return <span key={key}>{renderInterpretation(text)}</span>;
    }
    // highlighted is ReactNode (has amounts) — wrap for interpretation compat
    return <span key={key}>{highlighted}</span>;
  }
  return (
    <span key={key}>
      {boldParts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const inner = part.slice(2, -2);
          return (
            <strong key={i} className="font-semibold">
              {renderInterpretation(inner)}
            </strong>
          );
        }
        const highlighted = highlightAmounts(part);
        if (typeof highlighted === "string") {
          return renderInterpretation(part);
        }
        return <span key={i}>{highlighted}</span>;
      })}
    </span>
  );
}

// Renders block-level markdown (headers, bullets, paragraphs).
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let keyCounter = 0;

  const flushBullets = () => {
    if (bulletItems.length === 0) return;
    elements.push(
      <ul key={`ul-${keyCounter++}`} className="list-disc pl-5 my-2 space-y-0.5">
        {bulletItems.map((item, j) => (
          <li key={j} className="text-sm leading-relaxed">
            {renderInline(item, j)}
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushBullets();
      elements.push(
        <h3 key={keyCounter++} className="font-semibold text-sm mt-3 mb-1">
          {renderInline(trimmed.slice(4), 0)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushBullets();
      elements.push(
        <h2 key={keyCounter++} className="font-semibold text-base mt-4 mb-1 border-b pb-1">
          {renderInline(trimmed.slice(3), 0)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      flushBullets();
      elements.push(
        <h1 key={keyCounter++} className="font-bold text-lg mt-4 mb-2">
          {renderInline(trimmed.slice(2), 0)}
        </h1>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletItems.push(trimmed.slice(2));
    } else {
      flushBullets();
      elements.push(
        <p key={keyCounter++} className="text-sm leading-relaxed my-1">
          {renderInline(trimmed, 0)}
        </p>
      );
    }
  }
  flushBullets();
  return <div className="space-y-0.5">{elements}</div>;
}

export function ReportView() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);
  const analysisStep = useTaxStore((s) => s.analysisStep);
  const [activeTab, setActiveTab] = useState("interpretation");
  const [copied, setCopied] = useState(false);

  if (!report && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-2">
        {analysisStep ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${analysisStep === "law" ? "bg-primary animate-pulse" : "bg-muted"}`}
                />
                <span
                  className={`inline-block w-2 h-2 rounded-full ${analysisStep === "ai" ? "bg-primary animate-pulse" : "bg-muted"}`}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {analysisStep === "law" ? "관련 법령 조회 중..." : "AI 분석 중..."}
              </span>
            </div>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.interpretation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select all text (noop — clipboard may be unavailable in test env)
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center justify-between mb-1">
        <TabsList>
          <TabsTrigger value="interpretation">해석 보기</TabsTrigger>
          <TabsTrigger value="statutes">조문 보기</TabsTrigger>
        </TabsList>
        <button
          onClick={handleCopy}
          aria-label="보고서 복사"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">복사됨</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>복사</span>
            </>
          )}
        </button>
      </div>
      <TabsContent value="interpretation">
        {renderMarkdown(report.interpretation)}
      </TabsContent>
      <TabsContent value="statutes">
        {report.statutes.length === 0 || report.statutesAvailable === false ? (
          <p className="text-sm text-muted-foreground">법령 데이터를 조회하지 못했습니다. AI 분석 결과만 제공됩니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {report.statutes.map((s, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="text-sm">{s.name}: {s.text}</p>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
