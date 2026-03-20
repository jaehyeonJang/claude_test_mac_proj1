"use client";

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

export function InputForm() {
  const form = useTaxStore((s) => s.form);
  const setForm = useTaxStore((s) => s.setForm);
  const isLoading = useTaxStore((s) => s.isLoading);
  const setIsLoading = useTaxStore((s) => s.setIsLoading);
  const setReport = useTaxStore((s) => s.setReport);
  const addHistory = useTaxStore((s) => s.addHistory);

  const hasAnyValue = Object.values(form).some((v) => v !== "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setReport(data);
      addHistory({ timestamp: Date.now(), form, report: data });
      setForm({ incomeType: "", annualIncome: "", dependents: "", house: "", financialIncome: "", pension: "", prepaidTax: "", freeText: "" });
    } catch {
      // error — no-op
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="incomeType">소득 유형</FieldLabel>
          <Select
            value={form.incomeType}
            onValueChange={(v) => setForm({ incomeType: v })}
          >
            <SelectTrigger id="incomeType">
              <SelectValue placeholder="선택하세요" />
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
          <Input
            id="annualIncome"
            value={form.annualIncome}
            onChange={(e) => setForm({ annualIncome: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="dependents">부양가족 수</FieldLabel>
          <Input
            id="dependents"
            type="number"
            value={form.dependents}
            onChange={(e) => setForm({ dependents: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="house">주택 보유</FieldLabel>
          <Select
            value={form.house}
            onValueChange={(v) => setForm({ house: v })}
          >
            <SelectTrigger id="house">
              <SelectValue placeholder="선택하세요" />
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
          >
            <SelectTrigger id="financialIncome">
              <SelectValue placeholder="선택하세요" />
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
          >
            <SelectTrigger id="pension">
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="없음">없음</SelectItem>
                <SelectItem value="있음">있음</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="prepaidTax">기납부세액</FieldLabel>
          <Input
            id="prepaidTax"
            value={form.prepaidTax}
            onChange={(e) => setForm({ prepaidTax: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="freeText">자유 텍스트</FieldLabel>
          <Textarea
            id="freeText"
            value={form.freeText}
            onChange={(e) => setForm({ freeText: e.target.value })}
          />
        </Field>

        <Button type="submit" disabled={!hasAnyValue || isLoading}>
          {isLoading && <Spinner data-icon="inline-start" />}
          분석 요청
        </Button>
      </FieldGroup>
    </form>
  );
}
