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
import { Spinner } from "@/components/ui/spinner";

export function InputForm() {
  const form = useTaxStore((s) => s.form);
  const setForm = useTaxStore((s) => s.setForm);
  const isLoading = useTaxStore((s) => s.isLoading);
  const report = useTaxStore((s) => s.report);
  const error = useTaxStore((s) => s.error);
  const submitAnalysis = useTaxStore((s) => s.submitAnalysis);

  const hasAnyValue = Object.values(form).some((v) => v !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAnalysis();
  };

  return (
    <form onSubmit={handleSubmit} className={isLoading ? "opacity-50 pointer-events-none" : ""}>
      {!report && !isLoading && (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          폼을 입력하거나 추가 의뢰란에 내용을 입력하면 분석 요청이 가능합니다.
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="incomeType">소득 유형</FieldLabel>
          <Select
            value={form.incomeType}
            onValueChange={(v) => setForm({ incomeType: v })}
            disabled={isLoading}
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
            disabled={isLoading}
            placeholder="예: 5,000만원"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="dependents">부양가족 수</FieldLabel>
          <Input
            id="dependents"
            type="number"
            value={form.dependents}
            onChange={(e) => setForm({ dependents: e.target.value })}
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
            placeholder="예: 300만원"
          />
        </Field>

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

        <Button type="submit" disabled={!hasAnyValue || isLoading}>
          {isLoading && <Spinner data-icon="inline-start" />}
          분석 요청
        </Button>
      </FieldGroup>
    </form>
  );
}
