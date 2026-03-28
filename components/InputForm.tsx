"use client";

import { useTaxStore, type FormData } from "@/lib/store/taxStore";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

// ---------------------------------------------------------------------------
// Field definitions for dynamic rendering in step 2
// ---------------------------------------------------------------------------
type FieldType = "text" | "money" | "select";
interface FieldDef { label: string; type: FieldType; options?: string[] }

const FIELD_DEFS: Partial<Record<keyof FormData, FieldDef>> = {
  incomeType:             { label: "소득 유형",             type: "select", options: ["근로소득", "사업소득", "양도소득", "퇴직소득", "기타소득"] },
  annualIncome:           { label: "연간 소득",             type: "money" },
  prepaidTax:             { label: "기납부세액",            type: "money" },
  house:                  { label: "주택 보유",             type: "select", options: ["무주택", "1주택", "2주택 이상"] },
  financialIncome:        { label: "금융소득",              type: "select", options: ["없음", "2000만원 미만", "2000만원 초과"] },
  pension:                { label: "연금소득",              type: "select", options: ["없음", "있음"] },
  childDependents:        { label: "직계비속(자녀 등)",     type: "text" },
  spouseDependents:       { label: "배우자 공제",           type: "select", options: ["없음", "있음"] },
  elderDependents60:      { label: "직계존속 60세↑",        type: "text" },
  elderDependents70:      { label: "직계존속 70세↑(경로우대)", type: "text" },
  pensionSavingsAmount:   { label: "연금저축 납입액",       type: "money" },
  irpAmount:              { label: "IRP 납입액",            type: "money" },
  creditCard:             { label: "신용카드 사용액",       type: "money" },
  medicalExpense:         { label: "의료비",                type: "money" },
  educationExpense:       { label: "교육비",                type: "money" },
  insurancePremium:       { label: "보장성 보험료",         type: "money" },
  donation:               { label: "기부금",                type: "money" },
  housingSubscription:    { label: "주택청약 납입액",       type: "money" },
  monthlyRent:            { label: "월세 납입액(연간)",     type: "money" },
  smbEmployeeReduction:   { label: "중소기업 취업자 감면",  type: "select", options: ["해당없음", "청년", "60세 이상", "장애인", "경력단절여성"] },
  businessIndustry:       { label: "사업 업종",             type: "text" },
  businessExpenseRateType:{ label: "경비율 유형",           type: "select", options: ["단순경비율", "기준경비율", "복식부기"] },
  businessRevenue:        { label: "연간 매출액",           type: "money" },
  businessPurchaseExpense:{ label: "매입비용",              type: "money" },
  businessRentExpense:    { label: "임차료",                type: "money" },
  businessLaborExpense:   { label: "인건비",                type: "money" },
  capitalGainAssetType:   { label: "양도 자산 종류",        type: "select", options: ["부동산", "주식·펀드", "기타"] },
  capitalGainAcquisitionDate: { label: "취득일",            type: "text" },
  capitalGainTransferDate:{ label: "양도일",                type: "text" },
  capitalGainAcquisitionPrice: { label: "취득가액",         type: "money" },
  capitalGainTransferPrice: { label: "양도가액",            type: "money" },
  capitalGainExpenses:    { label: "필요경비",              type: "money" },
  capitalGainAdjustedZone:{ label: "조정대상지역",          type: "select", options: ["해당없음", "해당"] },
  retirementAmount:       { label: "퇴직급여 총액",         type: "money" },
  retirementYearsOfService:{ label: "근속연수(년)",         type: "text" },
  retirementIsExecutive:  { label: "임원 여부",             type: "select", options: ["비임원", "임원"] },
  retirementIrpRollover:  { label: "IRP 이연 수령",         type: "select", options: ["없음", "있음"] },
  retirementHasInterimSettlement: { label: "중간정산 이력", type: "select", options: ["없음", "있음"] },
  otherIncomeCategory:    { label: "기타소득 종류",         type: "text" },
  otherIncomeTaxType:     { label: "과세 방식",             type: "select", options: ["분리과세", "종합과세"] },
  // 증여세
  giftAssetType:          { label: "증여 재산 종류",        type: "select", options: ["토지", "건물", "현금·예금", "주식·펀드", "기타"] },
  giftAmount:             { label: "증여 재산가액",         type: "money" },
  giftRelationship:       { label: "증여자와의 관계",       type: "select", options: ["직계존속(부모·조부모)", "직계비속(자녀·손자녀)", "배우자", "기타친족", "타인"] },
  giftPriorAmount10Y:     { label: "10년 내 사전 증여 합산액", type: "money" },
  giftDate:               { label: "증여 예정일",           type: "text" },
  // 상속세
  inheritanceAmount:      { label: "상속 재산 총액",        type: "money" },
  inheritanceDebt:        { label: "채무·장례비 공제액",    type: "money" },
  inheritanceSpouse:      { label: "배우자 상속",           type: "select", options: ["없음", "있음"] },
};

// ---------------------------------------------------------------------------
// MoneyInput — 숫자 입력 + 단위 선택
// ---------------------------------------------------------------------------
function MoneyInput({
  id,
  fieldKey,
  value,
  disabled,
}: {
  id: string;
  fieldKey: keyof FormData;
  value: string;
  disabled?: boolean;
}) {
  const setForm = useTaxStore((s) => s.setForm);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ [fieldKey]: e.target.value } as Partial<FormData>);
  };

  return (
    <Input
      id={id}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder="예) 5000만원"
    />
  );
}

// ---------------------------------------------------------------------------
// DynamicField — 단일 필드 렌더링
// ---------------------------------------------------------------------------
function DynamicField({ fieldKey, disabled }: { fieldKey: keyof FormData; disabled?: boolean }) {
  const def = FIELD_DEFS[fieldKey];
  const form = useTaxStore((s) => s.form);
  const setForm = useTaxStore((s) => s.setForm);

  if (!def) return null;
  const id = `field-${fieldKey}`;
  const value = (form[fieldKey] as string) ?? "";

  if (def.type === "select" && def.options) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{def.label}</FieldLabel>
        <Select
          value={value}
          onValueChange={(v) => setForm({ [fieldKey]: v } as Partial<FormData>)}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={`${def.label} 선택`} />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (def.type === "money") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{def.label}</FieldLabel>
        <MoneyInput id={id} fieldKey={fieldKey} value={value} disabled={disabled} />
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{def.label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => setForm({ [fieldKey]: e.target.value } as Partial<FormData>)}
        disabled={disabled}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Stepper — 1/2단계 진행 표시
// ---------------------------------------------------------------------------
function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6" aria-label="진행 단계">
      <div className="flex items-center gap-2">
        {step === 1 ? (
          <div className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-foreground">1</div>
        ) : (
          <div className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">✓</div>
        )}
        <span className={`text-sm ${step === 1 ? "font-bold" : "text-muted-foreground"}`}>의뢰 입력</span>
      </div>
      <div className="flex-1 h-px bg-muted" />
      <div className="flex items-center gap-2">
        {step === 2 ? (
          <div className="rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-foreground">2</div>
        ) : (
          <div className="rounded-full w-6 h-6 flex items-center justify-center text-xs bg-muted text-muted-foreground">2</div>
        )}
        <span className={`text-sm ${step === 2 ? "font-bold" : "text-muted-foreground"}`}>정보 입력</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InputForm — 메인 컴포넌트
// ---------------------------------------------------------------------------
export function InputForm() {
  // ALL hooks must be called unconditionally at the top
  const step              = useTaxStore((s) => s.step);
  const request           = useTaxStore((s) => s.request);
  const setRequest        = useTaxStore((s) => s.setRequest);
  const dynamicFields     = useTaxStore((s) => s.dynamicFields);
  const isIdentifying     = useTaxStore((s) => s.isIdentifying);
  const clarificationMessage = useTaxStore((s) => s.clarificationMessage);
  const isLoading         = useTaxStore((s) => s.isLoading);
  const error             = useTaxStore((s) => s.error);
  const submitIdentifyFields = useTaxStore((s) => s.submitIdentifyFields);
  const goBackToStep1     = useTaxStore((s) => s.goBackToStep1);
  const submitAnalysis    = useTaxStore((s) => s.submitAnalysis);
  const report            = useTaxStore((s) => s.report);
  const form              = useTaxStore((s) => s.form);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitIdentifyFields();
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAnalysis();
  };

  // ---------------------------------------------------------------------------
  // Step 1: 의뢰 입력
  // ---------------------------------------------------------------------------
  if (step === 1) {
    return (
      <form onSubmit={handleNext}>
        <Stepper step={1} />

        <FieldGroup>
          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}

          <Field data-invalid={!!clarificationMessage || undefined}>
            <FieldLabel htmlFor="request">의뢰 내용</FieldLabel>
            <Textarea
              id="request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              disabled={isIdentifying}
              rows={5}
              placeholder="예) 프리랜서로 일하는데 종합소득세를 줄이고 싶어요. 연 매출은 8천만원 정도입니다."
              aria-invalid={!!clarificationMessage || undefined}
            />
          </Field>

          {clarificationMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
              <p className="text-destructive font-medium">{clarificationMessage}</p>
            </div>
          )}
        </FieldGroup>

        <div className="flex justify-end mt-4">
          <Button type="submit" disabled={isIdentifying || !request.trim()}>
            {isIdentifying && <Spinner className="h-4 w-4 mr-2" />}
            다음
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </form>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2 (분석 완료): 읽기 전용 요약
  // ---------------------------------------------------------------------------
  if (report !== null && !isLoading) {
    return (
      <div>
        <Stepper step={2} />

        {/* 제출된 필드 읽기 전용 */}
        {dynamicFields.length > 0 && (
          <div className="rounded-lg border bg-muted/20 divide-y text-sm mb-2">
            {dynamicFields.map((key) => {
              const def = FIELD_DEFS[key as keyof FormData];
              const value = (form[key as keyof FormData] as string) ?? "";
              if (!def || !value) return null;
              return (
                <div key={key} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground w-28 shrink-0">{def.label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2 (입력 중 / 로딩 중): 필드 입력 폼
  // ---------------------------------------------------------------------------
  return (
    <form onSubmit={handleAnalyze}>
      <Stepper step={2} />

      {/* 의뢰 요약 (읽기전용) */}
      <div className="mb-5 rounded-lg bg-muted/40 border px-3 py-2.5 flex items-start gap-2">
        <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        <div>
          <p className="text-[11px] text-muted-foreground mb-0.5">의뢰 내용</p>
          <p className="text-sm">{request}</p>
        </div>
      </div>

      {dynamicFields.length > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          의뢰 분석 결과, 아래 정보가 필요합니다.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive mb-4">{error}</p>
      )}

      <FieldGroup className="mb-6">
        {dynamicFields.map((key) => (
          <DynamicField
            key={key}
            fieldKey={key as keyof FormData}
            disabled={isLoading}
          />
        ))}
      </FieldGroup>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBackToStep1}
          disabled={isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Spinner className="h-4 w-4 mr-2" />}
          분석 요청
        </Button>
      </div>
    </form>
  );
}
