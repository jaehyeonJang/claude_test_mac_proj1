import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Statute } from "./lawApi";

const model = google("gemini-2.5-flash");

function sanitizeInput(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 2000);
}

export async function analyzeWithGemini(
  formData: Record<string, unknown>,
  statutes: Statute[],
  chatMessage?: string
): Promise<string> {
  const lawNotice =
    statutes.length === 0
      ? "\n\n※ 관련 법령 데이터를 조회하지 못했습니다. 일반 세법 지식을 기반으로 분석합니다."
      : "";

  const statuteSection =
    statutes.length > 0
      ? `\n\n관련 법령:\n${statutes.map((s) => `- ${s.name}: ${s.text}`).join("\n")}`
      : "";

  const chatSection = chatMessage
    ? `\n\n<추가질문>\n${sanitizeInput(chatMessage)}\n</추가질문>`
    : "";

  const freeTextSection = formData.freeText
    ? `\n\n<추가의뢰>\n${sanitizeInput(String(formData.freeText))}\n</추가의뢰>`
    : "";

  // 부양가족 상세 정보
  const dependentsFields = [
    formData.childDependents   && `- 직계비속(자녀 등) 20세 이하: ${formData.childDependents}명`,
    formData.spouseDependents  && formData.spouseDependents !== "없음" && `- 배우자 공제: ${formData.spouseDependents}`,
    formData.elderDependents60 && `- 직계존속 60세 이상: ${formData.elderDependents60}명`,
    formData.elderDependents70 && `- 직계존속 70세 이상(경로우대): ${formData.elderDependents70}명`,
    // 하위호환 (구 dependents 필드)
    !formData.childDependents && formData.dependents && `- 부양가족 수(합계): ${formData.dependents}명`,
  ].filter(Boolean).join("\n");

  // Optional deduction fields — only include when provided
  const extraFields = [
    formData.pensionSavingsAmount && `- 연금저축 납입액: ${formData.pensionSavingsAmount} (세액공제 한도 600만원)`,
    formData.irpAmount            && `- IRP 납입액: ${formData.irpAmount} (연금저축 포함 합산 한도 900만원)`,
    // 하위호환 (구 pensionSavings 필드)
    !formData.pensionSavingsAmount && formData.pensionSavings && `- 연금저축/IRP 납입액: ${formData.pensionSavings}`,
    formData.creditCard           && `- 신용카드 사용액: ${formData.creditCard}`,
    formData.medicalExpense       && `- 의료비: ${formData.medicalExpense}`,
    formData.educationExpense     && `- 교육비: ${formData.educationExpense}`,
    formData.insurancePremium     && `- 보장성 보험료: ${formData.insurancePremium} (세액공제 한도 100만원)`,
    formData.donation             && `- 기부금: ${formData.donation}`,
    formData.housingSubscription  && `- 주택청약 납입액: ${formData.housingSubscription}`,
    formData.monthlyRent          && `- 월세 납입액(연간): ${formData.monthlyRent}`,
    formData.smbEmployeeReduction && formData.smbEmployeeReduction !== "해당없음"
      && `- 중소기업 취업자 감면 대상: ${formData.smbEmployeeReduction}`,
    // 하위호환 (구 children 필드)
    !formData.childDependents && formData.children && `- 자녀 수: ${formData.children}명`,
  ].filter(Boolean).join("\n");

  const dependentsSection = dependentsFields ? `\n\n부양가족 상세:\n${dependentsFields}` : "";
  const extraSection = extraFields ? `\n\n추가 공제 정보:\n${extraFields}` : "";

  // 소득 유형: incomeTypes 배열 우선, 없으면 하위호환 필드 사용
  const incomeTypes: string[] = Array.isArray(formData.incomeTypes) && (formData.incomeTypes as string[]).length > 0
    ? formData.incomeTypes as string[]
    : [formData.incomeType, formData.incomeType2].filter((t): t is string => !!t && t !== "없음");

  // 양도소득 전용 필드
  const capitalGainFields = [
    formData.capitalGainAssetType      && `- 자산 종류: ${formData.capitalGainAssetType}`,
    formData.capitalGainAcquisitionDate && `- 취득일: ${formData.capitalGainAcquisitionDate}`,
    formData.capitalGainTransferDate    && `- 양도일: ${formData.capitalGainTransferDate}`,
    formData.capitalGainAcquisitionPrice && `- 취득가액: ${formData.capitalGainAcquisitionPrice}`,
    formData.capitalGainTransferPrice   && `- 양도가액: ${formData.capitalGainTransferPrice}`,
    formData.capitalGainExpenses        && `- 필요경비: ${formData.capitalGainExpenses}`,
    formData.capitalGainAdjustedZone    && `- 조정대상지역: ${formData.capitalGainAdjustedZone}`,
  ].filter(Boolean).join("\n");

  // 퇴직소득 전용 필드
  const retirementFields = [
    formData.retirementAmount              && `- 퇴직급여 총액: ${formData.retirementAmount}`,
    formData.retirementYearsOfService      && `- 근속연수: ${formData.retirementYearsOfService}년`,
    formData.retirementIsExecutive         && `- 임원 여부: ${formData.retirementIsExecutive}`,
    formData.retirementIrpRollover         && `- IRP 이연: ${formData.retirementIrpRollover}`,
    formData.retirementHasInterimSettlement && `- 중간정산 이력: ${formData.retirementHasInterimSettlement}`,
  ].filter(Boolean).join("\n");

  // 사업소득 전용 필드
  const businessFields = [
    formData.businessIndustry         && `- 업종: ${formData.businessIndustry}`,
    formData.businessExpenseRateType  && `- 경비율 유형: ${formData.businessExpenseRateType}`,
    formData.businessRevenue          && `- 매출액: ${formData.businessRevenue}`,
    formData.businessPurchaseExpense  && `- 매입비용: ${formData.businessPurchaseExpense}`,
    formData.businessRentExpense      && `- 임차료: ${formData.businessRentExpense}`,
    formData.businessLaborExpense     && `- 인건비: ${formData.businessLaborExpense}`,
  ].filter(Boolean).join("\n");

  // 기타소득 전용 필드
  const otherIncomeFields = [
    formData.otherIncomeCategory && `- 소득 종류: ${formData.otherIncomeCategory}`,
    formData.otherIncomeTaxType  && `- 과세 방식: ${formData.otherIncomeTaxType}`,
  ].filter(Boolean).join("\n");

  const specializedSections = [
    capitalGainFields && `\n양도소득 상세:\n${capitalGainFields}`,
    retirementFields  && `\n퇴직소득 상세:\n${retirementFields}`,
    businessFields    && `\n사업소득 상세:\n${businessFields}`,
    otherIncomeFields && `\n기타소득 상세:\n${otherIncomeFields}`,
  ].filter(Boolean).join("");

  const prompt = `당신은 한국 세법 전문가입니다. 아래 정보를 바탕으로 절세 방안을 분석해주세요.

입력 정보:
- 소득 유형: ${incomeTypes.length > 0 ? incomeTypes.join(", ") : "미입력"}
- 연간 소득: ${formData.annualIncome || "미입력"}
- 주택 보유: ${formData.house || "미입력"}
- 금융소득: ${formData.financialIncome || "미입력"}
- 연금소득: ${formData.pension || "미입력"}
- 기납부세액: ${formData.prepaidTax || "미입력"}${dependentsSection}${extraSection}${specializedSections}${freeTextSection}${lawNotice}${statuteSection}${chatSection}

${formData.freeText
    ? `<추가의뢰>에서 요청한 내용에 먼저 답변하고, 그 내용을 중심으로 핵심만 간결하게 분석해주세요. 전체 절세 항목을 나열하지 말고, 요청된 질문에 집중해서 답변해주세요.`
    : `절세 방안을 구체적으로 분석하고, 적용 가능한 공제 항목과 예상 절감 효과를 제시해주세요. 단, 정확한 세액은 개인 상황에 따라 다를 수 있으므로 범위로 제시해주세요.`}`;

  const result = await generateText({
    model,
    prompt,
  });

  return result.text;
}

export async function identifyRelevantLaws(
  formData: Record<string, unknown>,
  chatMessage?: string
): Promise<string[]> {
  const incomeTypes: string[] = Array.isArray(formData.incomeTypes) && (formData.incomeTypes as string[]).length > 0
    ? formData.incomeTypes as string[]
    : [formData.incomeType, formData.incomeType2].filter((t): t is string => !!t && t !== "없음");

  const context = [
    incomeTypes.length > 0 && `소득 유형: ${incomeTypes.join(", ")}`,
    formData.house && `주택: ${formData.house}`,
    formData.financialIncome && formData.financialIncome !== "없음" && `금융소득: ${formData.financialIncome}`,
    formData.pension && formData.pension !== "없음" && `연금소득: ${formData.pension}`,
    formData.freeText && `추가 의뢰: ${sanitizeInput(String(formData.freeText))}`,
    chatMessage && `사용자 질문: ${sanitizeInput(chatMessage)}`,
  ].filter(Boolean).join("\n");

  const prompt = `아래 세금 관련 정보를 분석하기 위해 참조해야 할 한국 법령명을 최대 3개 반환하세요.
반드시 www.law.go.kr에서 조회 가능한 정확한 법령 정식 명칭이어야 합니다.
JSON 배열 형식으로만 응답하세요. 예시: ["소득세법", "조세특례제한법"]

입력 정보:
${context}`;

  try {
    const result = await generateText({ model, prompt });
    const match = result.text.match(/\[[\s\S]*\]/);
    if (!match) return ["소득세법"];
    const names = JSON.parse(match[0]);
    if (!Array.isArray(names)) return ["소득세법"];
    return names.filter((n): n is string => typeof n === "string").slice(0, 3);
  } catch {
    return ["소득세법"];
  }
}

export async function chatWithGemini(
  currentReport: string,
  chatHistory: Array<{ role: string; content: string }>,
  message: string,
  statutes: Statute[] = []
): Promise<string> {
  const lawNotice =
    statutes.length === 0
      ? "\n\n※ 관련 법령 데이터를 조회하지 못했습니다. 보고서와 일반 세법 지식을 기반으로 답변합니다."
      : "";

  const statuteSection =
    statutes.length > 0
      ? `\n\n관련 법령:\n${statutes.map((s) => `- ${s.name}: ${s.text}`).join("\n")}`
      : "";

  const historySection =
    chatHistory.length > 0
      ? `\n\n대화 내역:\n${chatHistory
          .slice(-10)
          .map((m) => `${m.role === "user" ? "사용자" : "어시스턴트"}: ${m.content.slice(0, 500)}`)
          .join("\n")}`
      : "";

  const prompt = `당신은 한국 세법 전문가입니다. 아래 절세 분석 보고서와 관련 법령을 바탕으로 사용자의 질문에 간결하고 명확하게 답변해주세요.${lawNotice}${statuteSection}${historySection}

현재 보고서:
${currentReport}

사용자 질문: ${sanitizeInput(message)}

관련 법령과 보고서 내용을 근거로 2-3문장으로 간결하게 답변해주세요.`;

  const result = await generateText({ model, prompt });
  return result.text;
}
