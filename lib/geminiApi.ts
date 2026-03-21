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

  const prompt = `당신은 한국 세법 전문가입니다. 아래 정보를 바탕으로 절세 방안을 분석해주세요.

입력 정보:
- 소득 유형(주): ${formData.incomeType || "미입력"}${formData.incomeType2 && formData.incomeType2 !== "없음" ? ` / 부가: ${formData.incomeType2}` : ""}
- 연간 소득: ${formData.annualIncome || "미입력"}
- 주택 보유: ${formData.house || "미입력"}
- 금융소득: ${formData.financialIncome || "미입력"}
- 연금소득: ${formData.pension || "미입력"}
- 퇴직소득: ${formData.retirementIncome || "미입력"}
- 기납부세액: ${formData.prepaidTax || "미입력"}${dependentsSection}${extraSection}${freeTextSection}${lawNotice}${statuteSection}${chatSection}

절세 방안을 구체적으로 분석하고, 적용 가능한 공제 항목과 예상 절감 효과를 제시해주세요. 단, 정확한 세액은 개인 상황에 따라 다를 수 있으므로 범위로 제시해주세요.`;

  const result = await generateText({
    model,
    prompt,
  });

  return result.text;
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
