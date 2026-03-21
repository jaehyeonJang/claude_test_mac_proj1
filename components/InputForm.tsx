"use client";

import { useState } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDown, ChevronUp } from "lucide-react";

export function InputForm() {
  const form = useTaxStore((s) => s.form);
  const setForm = useTaxStore((s) => s.setForm);
  const isLoading = useTaxStore((s) => s.isLoading);
  const report = useTaxStore((s) => s.report);
  const error = useTaxStore((s) => s.error);
  const submitAnalysis = useTaxStore((s) => s.submitAnalysis);
  const analysisStep = useTaxStore((s) => s.analysisStep);

  // Local state for split income input (amount + unit combined into form.annualIncome)
  const [incomeAmount, setIncomeAmount] = useState<string>(() => {
    const val = form.annualIncome;
    if (val.endsWith("억원")) return val.slice(0, -2);
    if (val.endsWith("만원")) return val.slice(0, -2);
    return val;
  });
  const [incomeUnit, setIncomeUnit] = useState<"만원" | "억원">(() =>
    form.annualIncome.endsWith("억원") ? "억원" : "만원"
  );
  const [showExtra, setShowExtra] = useState(false);

  // !!v handles both "" and undefined (spec tests reset with only 8 original fields)
  const hasAnyValue = Object.values(form).some((v) => !!v);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIncomeAmount(val);
    setForm({ annualIncome: val ? val + incomeUnit : "" });
  };

  const handleUnitChange = (unit: string) => {
    setIncomeUnit(unit as "만원" | "억원");
    if (incomeAmount) {
      setForm({ annualIncome: incomeAmount + unit });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAnalysis();
  };

  return (
    <form onSubmit={handleSubmit} className={isLoading ? "opacity-50 pointer-events-none" : ""}>
      <FieldGroup className="gap-4">
        {!report && !isLoading && (
          <p className="text-xs text-muted-foreground">
            항목을 입력하거나 추가 의뢰란에 내용을 입력하면 분석 요청이 가능합니다.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        {/* 2-column compact grid for structured fields */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Field>
            <FieldLabel htmlFor="incomeType">소득 유형</FieldLabel>
            <Select
              value={form.incomeType}
              onValueChange={(v) => setForm({ incomeType: v })}
              disabled={isLoading}
            >
              <SelectTrigger id="incomeType">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="근로소득">근로소득</SelectItem>
                  <SelectItem value="사업소득">사업소득</SelectItem>
                  <SelectItem value="기타소득">기타소득</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="annualIncome">연간 소득</FieldLabel>
            <div className="flex gap-1">
              <Input
                id="annualIncome"
                value={incomeAmount}
                onChange={handleAmountChange}
                disabled={isLoading}
                placeholder="5000"
                className="flex-1 min-w-0"
              />
              <Select value={incomeUnit} onValueChange={handleUnitChange} disabled={isLoading}>
                <SelectTrigger className="w-[5.5rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="만원">만원</SelectItem>
                  <SelectItem value="억원">억원</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="dependents">부양가족 수</FieldLabel>
            <Input
              id="dependents"
              type="number"
              value={form.dependents}
              onChange={(e) => setForm({ dependents: e.target.value })}
              disabled={isLoading}
              placeholder="0"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="house">주택 보유</FieldLabel>
            <Select
              value={form.house}
              onValueChange={(v) => setForm({ house: v })}
              disabled={isLoading}
            >
              <SelectTrigger id="house">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="무주택">무주택</SelectItem>
                  <SelectItem value="1주택">1주택</SelectItem>
                  <SelectItem value="다주택">다주택</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="financialIncome">금융소득</FieldLabel>
            <Select
              value={form.financialIncome}
              onValueChange={(v) => setForm({ financialIncome: v })}
              disabled={isLoading}
            >
              <SelectTrigger id="financialIncome">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="없음">없음</SelectItem>
                  <SelectItem value="500만원 이하">500만원 이하</SelectItem>
                  <SelectItem value="500만원 초과">500만원 초과</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="pension">연금/퇴직소득</FieldLabel>
            <Select
              value={form.pension}
              onValueChange={(v) => setForm({ pension: v })}
              disabled={isLoading}
            >
              <SelectTrigger id="pension">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="없음">없음</SelectItem>
                  <SelectItem value="있음">있음</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field className="col-span-2">
            <FieldLabel htmlFor="prepaidTax">기납부세액</FieldLabel>
            <Input
              id="prepaidTax"
              value={form.prepaidTax}
              onChange={(e) => setForm({ prepaidTax: e.target.value })}
              disabled={isLoading}
              placeholder="예: 300만원"
            />
          </Field>
        </div>

        {/* Collapsible additional deduction fields */}
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          {showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          추가 공제 항목 (선택)
        </button>

        {showExtra && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-1 border-t">
            <Field>
              <FieldLabel htmlFor="pensionSavings">연금저축 / IRP</FieldLabel>
              <Input
                id="pensionSavings"
                value={form.pensionSavings ?? ""}
                onChange={(e) => setForm({ pensionSavings: e.target.value })}
                disabled={isLoading}
                placeholder="예: 400만원"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="creditCard">신용카드 사용액</FieldLabel>
              <Input
                id="creditCard"
                value={form.creditCard ?? ""}
                onChange={(e) => setForm({ creditCard: e.target.value })}
                disabled={isLoading}
                placeholder="예: 2000만원"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="medicalExpense">의료비</FieldLabel>
              <Input
                id="medicalExpense"
                value={form.medicalExpense ?? ""}
                onChange={(e) => setForm({ medicalExpense: e.target.value })}
                disabled={isLoading}
                placeholder="예: 300만원"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="children">자녀 수</FieldLabel>
              <Input
                id="children"
                type="number"
                value={form.children ?? ""}
                onChange={(e) => setForm({ children: e.target.value })}
                disabled={isLoading}
                placeholder="0"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="housingSubscription">주택청약 납입액</FieldLabel>
              <Input
                id="housingSubscription"
                value={form.housingSubscription ?? ""}
                onChange={(e) => setForm({ housingSubscription: e.target.value })}
                disabled={isLoading}
                placeholder="예: 240만원"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="monthlyRent">월세 납입액</FieldLabel>
              <Input
                id="monthlyRent"
                value={form.monthlyRent ?? ""}
                onChange={(e) => setForm({ monthlyRent: e.target.value })}
                disabled={isLoading}
                placeholder="예: 1200만원"
              />
            </Field>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="freeText">자유 텍스트 / 추가 의뢰 (선택)</FieldLabel>
          <Textarea
            id="freeText"
            value={form.freeText}
            onChange={(e) => setForm({ freeText: e.target.value })}
            disabled={isLoading}
            placeholder="폼을 채우지 않아도 여기에 직접 입력하여 분석 요청이 가능합니다."
          />
        </Field>

        <div className="space-y-2">
          <Button type="submit" disabled={!hasAnyValue || isLoading}>
            {isLoading && <Spinner data-icon="inline-start" />}
            분석 요청
          </Button>
          {isLoading && analysisStep && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Spinner className="h-3 w-3" />
              {analysisStep === "law" ? "관련 법령 조회 중..." : "AI 분석 중..."}
            </p>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
