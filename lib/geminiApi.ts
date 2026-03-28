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

  // 증여세 전용 필드
  const giftFields = [
    formData.giftAssetType      && `- 증여 재산 종류: ${formData.giftAssetType}`,
    formData.giftAmount         && `- 증여 재산가액: ${formData.giftAmount}`,
    formData.giftRelationship   && `- 증여자와의 관계: ${formData.giftRelationship}`,
    formData.giftPriorAmount10Y && `- 10년 내 사전 증여 합산액: ${formData.giftPriorAmount10Y}`,
    formData.giftDate           && `- 증여 예정일: ${formData.giftDate}`,
  ].filter(Boolean).join("\n");

  // 상속세 전용 필드
  const inheritanceFields = [
    formData.inheritanceAmount  && `- 상속 재산 총액: ${formData.inheritanceAmount}`,
    formData.inheritanceDebt    && `- 채무·장례비 공제액: ${formData.inheritanceDebt}`,
    formData.inheritanceSpouse  && `- 배우자 상속: ${formData.inheritanceSpouse}`,
  ].filter(Boolean).join("\n");

  const specializedSections = [
    capitalGainFields  && `\n양도소득 상세:\n${capitalGainFields}`,
    retirementFields   && `\n퇴직소득 상세:\n${retirementFields}`,
    businessFields     && `\n사업소득 상세:\n${businessFields}`,
    otherIncomeFields  && `\n기타소득 상세:\n${otherIncomeFields}`,
    giftFields         && `\n증여세 상세:\n${giftFields}`,
    inheritanceFields  && `\n상속세 상세:\n${inheritanceFields}`,
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
    formData.giftAmount && `증여 재산가액: ${formData.giftAmount}`,
    formData.giftRelationship && `증여 관계: ${formData.giftRelationship}`,
    formData.inheritanceAmount && `상속 재산: ${formData.inheritanceAmount}`,
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

// Valid FormData field keys the AI can return
const VALID_FIELD_KEYS = [
  "incomeType", "annualIncome", "prepaidTax", "house", "financialIncome",
  "pension", "retirementIncome", "childDependents", "spouseDependents",
  "elderDependents60", "elderDependents70", "pensionSavingsAmount", "irpAmount",
  "creditCard", "medicalExpense", "educationExpense", "insurancePremium",
  "donation", "housingSubscription", "monthlyRent", "smbEmployeeReduction",
  "capitalGainAssetType", "capitalGainAcquisitionDate", "capitalGainTransferDate",
  "capitalGainAcquisitionPrice", "capitalGainTransferPrice", "capitalGainExpenses",
  "capitalGainAdjustedZone", "retirementAmount", "retirementYearsOfService",
  "retirementIsExecutive", "retirementIrpRollover", "retirementHasInterimSettlement",
  "businessIndustry", "businessExpenseRateType", "businessRevenue",
  "businessPurchaseExpense", "businessRentExpense", "businessLaborExpense",
  "otherIncomeCategory", "otherIncomeTaxType",
  "giftAssetType", "giftAmount", "giftRelationship", "giftPriorAmount10Y", "giftDate",
  "inheritanceAmount", "inheritanceDebt", "inheritanceSpouse",
] as const;

export async function identifyRequiredFields(
  request: string
): Promise<{ fields: string[] } | { ambiguous: true; message: string }> {
  const prompt = `당신은 한국 세금 전문가입니다. 사용자의 세금 관련 의뢰를 분석하여 절세 방안 분석에 필요한 정보 필드를 결정하세요.

의뢰 내용:
"${sanitizeInput(request)}"

━━━ 소득 유형별 권장 필드 세트 ━━━

[근로소득]
필수: incomeType, annualIncome, prepaidTax
공제 관련: pensionSavingsAmount, irpAmount, creditCard, medicalExpense, educationExpense, insurancePremium, donation, housingSubscription, monthlyRent, smbEmployeeReduction
부양가족: childDependents, spouseDependents, elderDependents60, elderDependents70

[사업소득 / 프리랜서 / 자영업]
필수: incomeType, annualIncome, prepaidTax, businessIndustry, businessExpenseRateType, businessRevenue
경비 상세(기준경비율·복식부기 해당): businessPurchaseExpense, businessRentExpense, businessLaborExpense
공제: pensionSavingsAmount, irpAmount, childDependents, spouseDependents

[양도소득 (부동산·주식 매각)]
필수: incomeType, capitalGainAssetType, capitalGainAcquisitionDate, capitalGainTransferDate, capitalGainAcquisitionPrice, capitalGainTransferPrice, capitalGainExpenses, capitalGainAdjustedZone
추가: prepaidTax, house

[퇴직소득]
필수: incomeType, retirementAmount, retirementYearsOfService, retirementIsExecutive, retirementHasInterimSettlement
추가: retirementIrpRollover, prepaidTax

[기타소득 (강연·원고료·복권 등)]
필수: incomeType, annualIncome, otherIncomeCategory, otherIncomeTaxType
추가: prepaidTax

[증여세 (재산을 받는 경우: 부모·친족에게 토지·건물·현금·주식 등 받음)]
필수: giftAssetType, giftAmount, giftRelationship, giftPriorAmount10Y
추가: giftDate

[상속세 (사망으로 인한 재산 취득)]
필수: inheritanceAmount, inheritanceSpouse
추가: inheritanceDebt

[복합 소득]
- 복수 소득이 언급되면 각 소득 유형의 필수 필드를 합산
- 근로소득자가 증여를 받는 경우: 증여세 필드 + 근로소득 일부 필드 병행

━━━ 선택 규칙 ━━━
- 의뢰에서 소득 유형이 명확하지 않으면 반드시 incomeType 포함
- 양도·퇴직소득 외에는 annualIncome, prepaidTax 항상 포함
- 의뢰에 구체적 공제 항목(연금저축, 월세, 의료비 등)이 언급되면 해당 필드 포함
- 최대 15개까지 포함 가능
- 불필요한 필드는 제외하여 사용자 부담 최소화

━━━ 응답 형식 ━━━

의뢰가 조금이라도 분석 가능한 경우 (소득 유형이 완전히 불명확해도 incomeType 등 기본 필드로 시작 가능):
필드 키 목록을 JSON 배열로만 응답. 예: ["incomeType", "annualIncome", "prepaidTax"]
사용 가능한 키: ${VALID_FIELD_KEYS.join(", ")}

정말 세금·소득과 무관한 내용이거나 어떤 필드도 선택할 수 없는 경우에만 아래 JSON으로 응답:
{"ambiguous": true, "message": "<구체적인 이유: 어떤 정보가 없어서 분석이 불가능한지 한 문장으로>"}
예시: {"ambiguous": true, "message": "소득 유형(근로/사업/양도 등)을 알 수 없어 필요한 정보를 결정하기 어렵습니다. 어떤 종류의 소득에 대한 절세를 원하시나요?"}

JSON 외 다른 텍스트는 절대 포함하지 마세요.`;

  try {
    const result = await generateText({ model, prompt });
    const text = result.text.trim();

    // ambiguous 응답 체크
    if (text.includes('"ambiguous"') && text.includes('true')) {
      const match = text.match(/\{[\s\S]*"ambiguous"[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.ambiguous === true) {
          return { ambiguous: true, message: parsed.message ?? "의뢰 내용이 모호합니다. 구체적인 상황을 입력해주세요" };
        }
      }
    }

    // 필드 배열 응답 체크
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        const fields = parsed
          .filter((k): k is string => typeof k === "string" && (VALID_FIELD_KEYS as readonly string[]).includes(k))
          .slice(0, 15);
        if (fields.length > 0) return { fields };
      }
    }

    // 파싱 실패 → 기본 필드셋으로 진행
    return { fields: ["incomeType", "annualIncome", "prepaidTax"] };
  } catch {
    return { fields: ["incomeType", "annualIncome", "prepaidTax"] };
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
