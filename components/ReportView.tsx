"use client";

import { useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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

export function ReportView() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);
  const [activeTab, setActiveTab] = useState("interpretation");

  if (!report && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="interpretation">해석 보기</TabsTrigger>
        <TabsTrigger value="statutes">조문 보기</TabsTrigger>
      </TabsList>
      <TabsContent value="interpretation">
        <p>{renderInterpretation(report.interpretation)}</p>
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
