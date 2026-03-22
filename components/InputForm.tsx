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
import { ChevronDown, ChevronUp, X } from "lucide-react";

// ---------------------------------------------------------------------------
// MoneyInput: 숫자 + 단위(만원/억원) 분리 입력, 결합값을 onValueChange로 전달
// ---------------------------------------------------------------------------
function MoneyInput({
  id,
  value,
  onValueChange,
  disabled,
  placeholder = "0",
}: {
  id: string;
  value: string;
  onValueChange: (combined: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const initUnit = (val: string): "만원" | "억원" =>
    val.endsWith("억원") ? "억원" : "만원";
  const initAmount = (val: string): string => {
    if (val.endsWith("억원")) return val.slice(0, -2);
    if (val.endsWith("만원")) return val.slice(0, -2);
    return val;
  };

  const [amount, setAmount] = useState(() => initAmount(value));
  const [unit, setUnit] = useState<"만원" | "억원">(() => initUnit(value));

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setAmount(v);
    onValueChange(v ? v + unit : "");
  };
  const handleUnit = (u: string) => {
    const next = u as "만원" | "억원";
    setUnit(next);
    if (amount) onValueChange(amount + next);
  };

  return (
    <div className="flex gap-1">
      <Input
        id={id}
        value={amount}
        onChange={handleAmount}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0"
      />
      <Select value={unit} onValueChange={handleUnit} disabled={disabled}>
        <SelectTrigger className="w-[5.5rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="만원">만원</SelectItem>
          <SelectItem value="억원">억원</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 소득 유형별 연간 소득 힌트
// ---------------------------------------------------------------------------
const INCOME_HINT: Record<string, string> = {
  "근로소득": "총급여액 기준 (세전 연봉, 비과세 제외)",
  "사업소득": "사업소득금액 기준 (매출 - 필요경비)",
  "기타소득": "기타소득금액 기준 (수입 - 필요경비 60%)",
  "양도소득": "양도차익 기준 (양도가 - 취득가 - 필요경비)",
  "퇴직소득": "퇴직급여액 기준 (세전 수령액)",
};

const ALL_INCOME_TYPES = ["근로소득", "사업소득", "기타소득", "양도소득", "퇴직소득"];

// ---------------------------------------------------------------------------
// InputForm
// ---------------------------------------------------------------------------
export function InputForm() {
  const form = useTaxStore((s) => s.form);
  const setForm = useTaxStore((s) => s.setForm);
  const isLoading = useTaxStore((s) => s.isLoading);
  const report = useTaxStore((s) => s.report);
  const error = useTaxStore((s) => s.error);
  const submitAnalysis = useTaxStore((s) => s.submitAnalysis);
  const analysisStep = useTaxStore((s) => s.analysisStep);

  const [showExtra, setShowExtra] = useState(false);
  // Select 리셋용 key (소득 유형 추가 후 placeholder로 복귀)
  const [selectKey, setSelectKey] = useState(0);

  const incomeTypes = form.incomeTypes ?? [];

  const handleAddIncomeType = (type: string) => {
    if (!incomeTypes.includes(type)) {
      setForm({ incomeTypes: [...incomeTypes, type] });
    }
    setSelectKey((k) => k + 1);
  };

  const handleRemoveIncomeType = (type: string) => {
    setForm({ incomeTypes: incomeTypes.filter((t) => t !== type) });
  };

  const hasAnyValue = Object.values(form).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAnalysis();
  };

  // 연간 소득 힌트: 단일 선택이면 해당 힌트, 복수면 일반 안내
  const incomeHint =
    incomeTypes.length === 1
      ? INCOME_HINT[incomeTypes[0]]
      : incomeTypes.length > 1
      ? "복수 소득 — 주 소득 합계 기준"
      : null;

  // 남은 소득 유형 선택지 (이미 선택된 것 제외)
  const remainingTypes = ALL_INCOME_TYPES.filter((t) => !incomeTypes.includes(t));

  const has사업소득 = incomeTypes.includes("사업소득");
  const has양도소득 = incomeTypes.includes("양도소득");
  const has퇴직소득 = incomeTypes.includes("퇴직소득");
  const has기타소득 = incomeTypes.includes("기타소득");

  // 기준경비율·복식부기일 때 주요 경비 필드 표시
  const showBusinessExpenseFields =
    form.businessExpenseRateType === "기준경비율" ||
    form.businessExpenseRateType === "복식부기";

  return (
    <form onSubmit={handleSubmit} className={isLoading ? "opacity-50 pointer-events-none" : ""}>
      <FieldGroup className="gap-5">
        {!report && !isLoading && (
          <p className="text-xs text-muted-foreground">
            항목을 입력하거나 추가 의뢰란에 내용을 입력하면 분석 요청이 가능합니다.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        {/* ── 소득 정보 ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">소득 정보</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">

            {/* 소득 유형 다중 선택 */}
            <Field className="col-span-2">
              <FieldLabel htmlFor="incomeType">소득 유형</FieldLabel>

              {/* 선택된 소득 유형 칩 */}
              {incomeTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {incomeTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                    >
                      {type}
                      <button
                        type="button"
                        onClick={() => handleRemoveIncomeType(type)}
                        disabled={isLoading}
                        className="hover:text-destructive transition-colors"
                        aria-label={`${type} 제거`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 소득 유형 추가 Select (spec 테스트 호환: role="option") */}
              {remainingTypes.length > 0 && (
                <Select
                  key={selectKey}
                  onValueChange={handleAddIncomeType}
                  disabled={isLoading}
                >
                  <SelectTrigger id="incomeType">
                    <SelectValue placeholder="소득 유형 추가 +" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {remainingTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              {remainingTypes.length === 0 && (
                <p className="text-[11px] text-muted-foreground">모든 소득 유형이 선택되었습니다</p>
              )}
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="annualIncome">연간 소득</FieldLabel>
              <MoneyInput
                id="annualIncome"
                value={form.annualIncome}
                onValueChange={(v) => setForm({ annualIncome: v })}
                disabled={isLoading}
                placeholder="5000"
              />
              {incomeHint && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{incomeHint}</p>
              )}
            </Field>

            <Field className="col-span-2">
              <FieldLabel htmlFor="prepaidTax">기납부세액</FieldLabel>
              <MoneyInput
                id="prepaidTax"
                value={form.prepaidTax}
                onValueChange={(v) => setForm({ prepaidTax: v })}
                disabled={isLoading}
                placeholder="300"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">원천징수 또는 중간예납 납부액 기준</p>
            </Field>
          </div>
        </div>

        {/* ── 사업소득 전용 필드 ── */}
        {has사업소득 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">사업소득 상세</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">

              <Field>
                <FieldLabel htmlFor="businessIndustry">업종</FieldLabel>
                <Select
                  value={form.businessIndustry ?? ""}
                  onValueChange={(v) => setForm({ businessIndustry: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="businessIndustry">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="도소매업">도소매업</SelectItem>
                      <SelectItem value="서비스업">서비스업</SelectItem>
                      <SelectItem value="제조업">제조업</SelectItem>
                      <SelectItem value="건설업">건설업</SelectItem>
                      <SelectItem value="음식·숙박업">음식·숙박업</SelectItem>
                      <SelectItem value="프리랜서·기타">프리랜서·기타</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="businessExpenseRateType">경비율 유형</FieldLabel>
                <Select
                  value={form.businessExpenseRateType ?? ""}
                  onValueChange={(v) => setForm({ businessExpenseRateType: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="businessExpenseRateType">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="단순경비율">단순경비율</SelectItem>
                      <SelectItem value="기준경비율">기준경비율</SelectItem>
                      <SelectItem value="복식부기">복식부기 (장부)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-0.5">수입 규모에 따라 강제 적용 기준 상이</p>
              </Field>

              <Field className="col-span-2">
                <FieldLabel htmlFor="businessRevenue">매출액 (수입금액)</FieldLabel>
                <MoneyInput
                  id="businessRevenue"
                  value={form.businessRevenue ?? ""}
                  onValueChange={(v) => setForm({ businessRevenue: v })}
                  disabled={isLoading}
                  placeholder="5000"
                />
              </Field>

              {showBusinessExpenseFields && (
                <>
                  <Field>
                    <FieldLabel htmlFor="businessPurchaseExpense">매입비용</FieldLabel>
                    <MoneyInput
                      id="businessPurchaseExpense"
                      value={form.businessPurchaseExpense ?? ""}
                      onValueChange={(v) => setForm({ businessPurchaseExpense: v })}
                      disabled={isLoading}
                      placeholder="0"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">상품·원재료 매입액</p>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="businessRentExpense">임차료</FieldLabel>
                    <MoneyInput
                      id="businessRentExpense"
                      value={form.businessRentExpense ?? ""}
                      onValueChange={(v) => setForm({ businessRentExpense: v })}
                      disabled={isLoading}
                      placeholder="0"
                    />
                  </Field>

                  <Field className="col-span-2">
                    <FieldLabel htmlFor="businessLaborExpense">인건비</FieldLabel>
                    <MoneyInput
                      id="businessLaborExpense"
                      value={form.businessLaborExpense ?? ""}
                      onValueChange={(v) => setForm({ businessLaborExpense: v })}
                      disabled={isLoading}
                      placeholder="0"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">직원 급여·일용직 포함</p>
                  </Field>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 양도소득 전용 필드 ── */}
        {has양도소득 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">양도소득 상세</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">

              <Field className="col-span-2">
                <FieldLabel htmlFor="capitalGainAssetType">자산 종류</FieldLabel>
                <Select
                  value={form.capitalGainAssetType ?? ""}
                  onValueChange={(v) => setForm({ capitalGainAssetType: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="capitalGainAssetType">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="부동산">부동산 (토지·건물)</SelectItem>
                      <SelectItem value="주식·펀드">주식·펀드</SelectItem>
                      <SelectItem value="분양권·입주권">분양권·입주권</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainAcquisitionDate">취득일</FieldLabel>
                <Input
                  id="capitalGainAcquisitionDate"
                  type="date"
                  value={form.capitalGainAcquisitionDate ?? ""}
                  onChange={(e) => setForm({ capitalGainAcquisitionDate: e.target.value })}
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainTransferDate">양도일</FieldLabel>
                <Input
                  id="capitalGainTransferDate"
                  type="date"
                  value={form.capitalGainTransferDate ?? ""}
                  onChange={(e) => setForm({ capitalGainTransferDate: e.target.value })}
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainAcquisitionPrice">취득가액</FieldLabel>
                <MoneyInput
                  id="capitalGainAcquisitionPrice"
                  value={form.capitalGainAcquisitionPrice ?? ""}
                  onValueChange={(v) => setForm({ capitalGainAcquisitionPrice: v })}
                  disabled={isLoading}
                  placeholder="3억"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainTransferPrice">양도가액</FieldLabel>
                <MoneyInput
                  id="capitalGainTransferPrice"
                  value={form.capitalGainTransferPrice ?? ""}
                  onValueChange={(v) => setForm({ capitalGainTransferPrice: v })}
                  disabled={isLoading}
                  placeholder="5억"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainExpenses">필요경비</FieldLabel>
                <MoneyInput
                  id="capitalGainExpenses"
                  value={form.capitalGainExpenses ?? ""}
                  onValueChange={(v) => setForm({ capitalGainExpenses: v })}
                  disabled={isLoading}
                  placeholder="500"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">중개수수료, 등기비, 수리비 등</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="capitalGainAdjustedZone">조정대상지역</FieldLabel>
                <Select
                  value={form.capitalGainAdjustedZone ?? ""}
                  onValueChange={(v) => setForm({ capitalGainAdjustedZone: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="capitalGainAdjustedZone">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="예">예 (중과 대상)</SelectItem>
                      <SelectItem value="아니오">아니오</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-0.5">다주택자 중과세율 적용 여부</p>
              </Field>
            </div>
          </div>
        )}

        {/* ── 퇴직소득 전용 필드 ── */}
        {has퇴직소득 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">퇴직소득 상세</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">

              <Field className="col-span-2">
                <FieldLabel htmlFor="retirementAmount">퇴직급여 총액</FieldLabel>
                <MoneyInput
                  id="retirementAmount"
                  value={form.retirementAmount ?? ""}
                  onValueChange={(v) => setForm({ retirementAmount: v })}
                  disabled={isLoading}
                  placeholder="5000"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">세전 수령액 기준</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="retirementYearsOfService">근속연수 (년)</FieldLabel>
                <Input
                  id="retirementYearsOfService"
                  type="number"
                  min="1"
                  value={form.retirementYearsOfService ?? ""}
                  onChange={(e) => setForm({ retirementYearsOfService: e.target.value })}
                  disabled={isLoading}
                  placeholder="10"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">근속연수공제 핵심 변수</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="retirementIsExecutive">임원 여부</FieldLabel>
                <Select
                  value={form.retirementIsExecutive ?? ""}
                  onValueChange={(v) => setForm({ retirementIsExecutive: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="retirementIsExecutive">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="일반직원">일반직원</SelectItem>
                      <SelectItem value="임원">임원 (퇴직금 한도 제한)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="retirementIrpRollover">IRP 이연 수령</FieldLabel>
                <Select
                  value={form.retirementIrpRollover ?? ""}
                  onValueChange={(v) => setForm({ retirementIrpRollover: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="retirementIrpRollover">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="즉시 수령">즉시 수령</SelectItem>
                      <SelectItem value="IRP 이연">IRP 이연 (과세 이연)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="retirementHasInterimSettlement">중간정산 이력</FieldLabel>
                <Select
                  value={form.retirementHasInterimSettlement ?? ""}
                  onValueChange={(v) => setForm({ retirementHasInterimSettlement: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="retirementHasInterimSettlement">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="없음">없음</SelectItem>
                      <SelectItem value="있음">있음 (이후 근속연수만 적용)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* ── 기타소득 전용 필드 ── */}
        {has기타소득 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">기타소득 상세</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">

              <Field>
                <FieldLabel htmlFor="otherIncomeCategory">소득 종류</FieldLabel>
                <Select
                  value={form.otherIncomeCategory ?? ""}
                  onValueChange={(v) => setForm({ otherIncomeCategory: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="otherIncomeCategory">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="강의료·원고료">강의료·원고료 (필요경비 60%)</SelectItem>
                      <SelectItem value="복권·사례금">복권·사례금</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="otherIncomeTaxType">과세 방식</FieldLabel>
                <Select
                  value={form.otherIncomeTaxType ?? ""}
                  onValueChange={(v) => setForm({ otherIncomeTaxType: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="otherIncomeTaxType">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="분리과세">분리과세 (300만원 이하)</SelectItem>
                      <SelectItem value="종합과세">종합과세 (300만원 초과 또는 선택)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* ── 자산·소득 현황 ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">자산 · 소득 현황</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">

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
              <FieldLabel htmlFor="financialIncome">금융소득 (이자·배당)</FieldLabel>
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
                    <SelectItem value="2000만원 이하">2,000만원 이하</SelectItem>
                    <SelectItem value="2000만원 초과">2,000만원 초과 (종합과세)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="pension">연금소득</FieldLabel>
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
          </div>
        </div>

        {/* ── 부양가족 공제 ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">부양가족 공제</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">

            <Field>
              <FieldLabel htmlFor="childDependents">부양가족 (자녀·직계비속 20세↓)</FieldLabel>
              <Input
                id="childDependents"
                type="number"
                value={form.childDependents ?? ""}
                onChange={(e) => setForm({ childDependents: e.target.value })}
                disabled={isLoading}
                placeholder="0"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="spouseDependents">배우자 공제</FieldLabel>
              <Select
                value={form.spouseDependents ?? ""}
                onValueChange={(v) => setForm({ spouseDependents: v })}
                disabled={isLoading}
              >
                <SelectTrigger id="spouseDependents">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="없음">없음</SelectItem>
                    <SelectItem value="있음">있음 (연 소득 100만원 이하)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="elderDependents60">직계존속 60세 이상</FieldLabel>
              <Input
                id="elderDependents60"
                type="number"
                value={form.elderDependents60 ?? ""}
                onChange={(e) => setForm({ elderDependents60: e.target.value })}
                disabled={isLoading}
                placeholder="0"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="elderDependents70">직계존속 70세 이상 <span className="text-muted-foreground font-normal text-[11px]">(경로우대)</span></FieldLabel>
              <Input
                id="elderDependents70"
                type="number"
                value={form.elderDependents70 ?? ""}
                onChange={(e) => setForm({ elderDependents70: e.target.value })}
                disabled={isLoading}
                placeholder="0"
              />
            </Field>
          </div>
        </div>

        {/* ── 추가 공제 항목 (접힘) ── */}
        <div className="space-y-2">
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
                <FieldLabel htmlFor="pensionSavingsAmount">연금저축</FieldLabel>
                <MoneyInput
                  id="pensionSavingsAmount"
                  value={form.pensionSavingsAmount ?? ""}
                  onValueChange={(v) => setForm({ pensionSavingsAmount: v })}
                  disabled={isLoading}
                  placeholder="600"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">세액공제 한도 600만원</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="irpAmount">IRP (개인형 퇴직연금)</FieldLabel>
                <MoneyInput
                  id="irpAmount"
                  value={form.irpAmount ?? ""}
                  onValueChange={(v) => setForm({ irpAmount: v })}
                  disabled={isLoading}
                  placeholder="300"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">연금저축 포함 합산 한도 900만원</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="creditCard">신용카드 사용액</FieldLabel>
                <MoneyInput
                  id="creditCard"
                  value={form.creditCard ?? ""}
                  onValueChange={(v) => setForm({ creditCard: v })}
                  disabled={isLoading}
                  placeholder="2000"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="medicalExpense">의료비</FieldLabel>
                <MoneyInput
                  id="medicalExpense"
                  value={form.medicalExpense ?? ""}
                  onValueChange={(v) => setForm({ medicalExpense: v })}
                  disabled={isLoading}
                  placeholder="300"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="educationExpense">교육비</FieldLabel>
                <MoneyInput
                  id="educationExpense"
                  value={form.educationExpense ?? ""}
                  onValueChange={(v) => setForm({ educationExpense: v })}
                  disabled={isLoading}
                  placeholder="500"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="insurancePremium">보장성 보험료</FieldLabel>
                <MoneyInput
                  id="insurancePremium"
                  value={form.insurancePremium ?? ""}
                  onValueChange={(v) => setForm({ insurancePremium: v })}
                  disabled={isLoading}
                  placeholder="100"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">세액공제 한도 100만원</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="donation">기부금</FieldLabel>
                <MoneyInput
                  id="donation"
                  value={form.donation ?? ""}
                  onValueChange={(v) => setForm({ donation: v })}
                  disabled={isLoading}
                  placeholder="200"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="housingSubscription">주택청약 납입액</FieldLabel>
                <MoneyInput
                  id="housingSubscription"
                  value={form.housingSubscription ?? ""}
                  onValueChange={(v) => setForm({ housingSubscription: v })}
                  disabled={isLoading}
                  placeholder="240"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">세대주·총급여 7,000만원 이하 조건</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="monthlyRent">월세 납입액 (연간)</FieldLabel>
                <MoneyInput
                  id="monthlyRent"
                  value={form.monthlyRent ?? ""}
                  onValueChange={(v) => setForm({ monthlyRent: v })}
                  disabled={isLoading}
                  placeholder="1200"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">총급여 7,000만원 이하·국민주택규모 조건</p>
              </Field>

              <Field>
                <FieldLabel htmlFor="smbEmployeeReduction">중소기업 취업자 감면</FieldLabel>
                <Select
                  value={form.smbEmployeeReduction ?? ""}
                  onValueChange={(v) => setForm({ smbEmployeeReduction: v })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="smbEmployeeReduction">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="해당없음">해당없음</SelectItem>
                      <SelectItem value="청년">청년 (34세 이하, 70% 감면)</SelectItem>
                      <SelectItem value="경력단절여성">경력단절여성 (70% 감면)</SelectItem>
                      <SelectItem value="장애인·60세이상">장애인·60세 이상 (70% 감면)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
        </div>

        {/* ── 자유 텍스트 ── */}
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
