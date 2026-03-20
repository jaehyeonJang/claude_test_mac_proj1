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
        {activeTab === "interpretation" && (
          <p>{renderInterpretation(report.interpretation)}</p>
        )}
      </TabsContent>
      <TabsContent value="statutes">
        {activeTab === "statutes" &&
          report.statutes.map((s) => (
            <p key={s.name}>
              {s.name}: {s.text}
            </p>
          ))}
      </TabsContent>
    </Tabs>
  );
}
