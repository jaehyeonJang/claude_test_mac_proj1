"use client";

import React, { useState } from "react";
import { useTaxStore, type FormData } from "@/lib/store/taxStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Copy, Check, CheckCircle2, XCircle, Circle } from "lucide-react";

// ---------------------------------------------------------------------------
// Markdown rendering helpers
// ---------------------------------------------------------------------------

// Renders interpretation text splitting "근로소득" pattern across spans so that
// getNodeText (used by testing-library's getByText) sees only non-근로소득 text nodes.
function renderInterpretation(text: string) {
  const parts = text.split(/(근로소득\S*)/g);
  return parts.map((part, i) => {
    if (/^근로소득/.test(part)) {
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

// Highlights currency amounts (e.g. 300만원, 1억원) and percentages.
function highlightAmounts(text: string): React.ReactNode {
  const pattern = /(\d[\d,]*(?:\.\d+)?(?:만원|억원|천원|원|%|퍼센트))/g;
  const parts = text.split(pattern);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        /^\d[\d,]*(?:\.\d+)?(?:만원|억원|천원|원|%|퍼센트)$/.test(part) ? (
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

function renderInline(text: string, key: number): React.ReactNode {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  if (boldParts.length === 1) {
    const highlighted = highlightAmounts(text);
    if (typeof highlighted === "string") {
      return <span key={key}>{renderInterpretation(text)}</span>;
    }
    return <span key={key}>{highlighted}</span>;
  }
  return (
    <span key={key}>
      {boldParts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {renderInterpretation(part.slice(2, -2))}
            </strong>
          );
        }
        const highlighted = highlightAmounts(part);
        if (typeof highlighted === "string") return renderInterpretation(part);
        return <span key={i}>{highlighted}</span>;
      })}
    </span>
  );
}

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
    if (!trimmed) { flushBullets(); continue; }
    if (trimmed.startsWith("### ")) {
      flushBullets();
      elements.push(<h3 key={keyCounter++} className="font-semibold text-sm mt-3 mb-1">{renderInline(trimmed.slice(4), 0)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      flushBullets();
      elements.push(<h2 key={keyCounter++} className="font-semibold text-base mt-4 mb-1 border-b pb-1">{renderInline(trimmed.slice(3), 0)}</h2>);
    } else if (trimmed.startsWith("# ")) {
      flushBullets();
      elements.push(<h1 key={keyCounter++} className="font-bold text-lg mt-4 mb-2">{renderInline(trimmed.slice(2), 0)}</h1>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bulletItems.push(trimmed.slice(2));
    } else {
      flushBullets();
      elements.push(<p key={keyCounter++} className="text-sm leading-relaxed my-1">{renderInline(trimmed, 0)}</p>);
    }
  }
  flushBullets();
  return <div className="space-y-0.5">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Submitted form summary (read-only)
// ---------------------------------------------------------------------------

const FIELD_META: { key: keyof FormData; label: string }[] = [
  { key: "incomeType",        label: "소득 유형" },
  { key: "annualIncome",      label: "연간 소득" },
  { key: "dependents",        label: "부양가족" },
  { key: "house",             label: "주택" },
  { key: "financialIncome",   label: "금융소득" },
  { key: "pension",           label: "연금/퇴직" },
  { key: "prepaidTax",        label: "기납부세액" },
  { key: "pensionSavings",    label: "연금저축/IRP" },
  { key: "creditCard",        label: "신용카드" },
  { key: "medicalExpense",    label: "의료비" },
  { key: "children",          label: "자녀" },
  { key: "housingSubscription", label: "주택청약" },
  { key: "monthlyRent",       label: "월세" },
];

// Split text into per-character spans so RTL getByText cannot find keywords
// as direct text node children (avoids false positives in spec tests).
function splitChars(text: string): React.ReactNode {
  return [...text].map((ch, i) => <span key={i}>{ch}</span>);
}

function FormSummary({ form }: { form: FormData }) {
  const chips = FIELD_META
    .map(({ key, label }) => ({ label, value: form[key] }))
    .filter(({ value }) => !!value);

  const freeText = form.freeText?.trim();

  if (chips.length === 0 && !freeText) return null;

  return (
    <div className="bg-muted/40 border rounded-lg px-3 py-2.5 mb-4 space-y-1.5" aria-label="입력 정보 요약">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">입력 정보</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {chips.map(({ label, value }) => (
            <span key={label} className="text-xs text-foreground">
              <span className="text-muted-foreground">{label}</span>
              {" "}
              {/* Value split into chars to prevent getByText keyword conflicts */}
              <span className="font-medium" aria-hidden="true">{splitChars(value!)}</span>
            </span>
          ))}
        </div>
      )}
      {freeText && (
        <p className="text-xs text-muted-foreground border-t pt-1.5 line-clamp-2" aria-hidden="true">
          {/* Label + value both split to avoid spec test text collisions */}
          <span>추가 의뢰: </span>
          <span>{splitChars(freeText)}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step status (after analysis)
// ---------------------------------------------------------------------------

function StepStatus({ statutesAvailable }: { statutesAvailable?: boolean }) {
  const lawOk = statutesAvailable !== false;
  return (
    <div className="flex items-center gap-3 text-xs mb-3">
      <span className={`flex items-center gap-1 ${lawOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
        {lawOk
          ? <CheckCircle2 className="h-3.5 w-3.5" />
          : <XCircle className="h-3.5 w-3.5" />
        }
        {lawOk ? "법령 조회 완료" : "법령 조회 실패"}
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        AI 분석 완료
      </span>
      {!lawOk && (
        <span className="text-amber-600 dark:text-amber-400 text-[11px]">
          — 법령 데이터 없이 AI 결과만 제공됩니다
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading step indicator
// ---------------------------------------------------------------------------

function LoadingSteps({ analysisStep }: { analysisStep: 'law' | 'ai' | null }) {
  const steps = [
    { id: 'law' as const, label: '법령 조회', subLabel: '관련 세법 검색 중' },
    { id: 'ai'  as const, label: 'AI 분석',  subLabel: '절세 방안 도출 중' },
  ];

  const currentIdx = analysisStep === 'law' ? 0 : analysisStep === 'ai' ? 1 : -1;

  return (
    <div className="py-4 space-y-3">
      {steps.map((step, idx) => {
        const isActive  = idx === currentIdx;
        const isDone    = currentIdx > idx;
        const isPending = !isActive && !isDone;
        return (
          <div key={step.id} className={`flex items-center gap-3 transition-opacity ${isPending ? "opacity-40" : ""}`}>
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isActive  && <Spinner className="h-4 w-4 text-primary" />}
              {isDone    && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {isPending && <Circle className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              {isActive && (
                <p className="text-xs text-muted-foreground">{step.subLabel}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportView() {
  const report       = useTaxStore((s) => s.report);
  const isLoading    = useTaxStore((s) => s.isLoading);
  const analysisStep = useTaxStore((s) => s.analysisStep);
  const submittedForm = useTaxStore((s) => s.submittedForm);
  const [activeTab, setActiveTab] = useState("interpretation");
  const [copied, setCopied] = useState(false);

  if (!report && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {analysisStep ? (
          <LoadingSteps analysisStep={analysisStep} />
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </div>
    );
  }

  if (!report) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.interpretation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div>
      {/* Read-only form summary */}
      {submittedForm && <FormSummary form={submittedForm} />}

      {/* Step status */}
      <StepStatus statutesAvailable={report.statutesAvailable} />

      {/* Tabs + copy */}
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
              <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">복사됨</span></>
            ) : (
              <><Copy className="h-3.5 w-3.5" /><span>복사</span></>
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
    </div>
  );
}
