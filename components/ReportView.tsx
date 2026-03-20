"use client";

import { useTaxStore } from "@/lib/store/taxStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportView() {
  const report = useTaxStore((s) => s.report);
  const isLoading = useTaxStore((s) => s.isLoading);

  if (!report && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
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
    <Tabs defaultValue="interpretation">
      <TabsList>
        <TabsTrigger value="interpretation">해석 보기</TabsTrigger>
        <TabsTrigger value="statutes">조문 보기</TabsTrigger>
      </TabsList>
      <TabsContent value="interpretation">
        {report.interpretation}
      </TabsContent>
      <TabsContent value="statutes">
        {report.statutes.map((s) => (
          <div key={s.name}>
            <h3>{s.name}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
