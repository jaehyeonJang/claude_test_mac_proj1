import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { Statute } from "./lawApi";

const model = google("gemini-2.0-flash");

function sanitizeInput(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 2000);
}

export async function analyzeWithGemini(
  formData: Record<string, unknown>,
  statutes: Statute[],
  chatMessage?: string
): Promise<string> {
  const statuteSection =
    statutes.length > 0
      ? `\n\n관련 법령:\n${statutes.map((s) => `- ${s.name}: ${s.text}`).join("\n")}`
      : "";

  const chatSection = chatMessage
    ? `\n\n<추가질문>\n${sanitizeInput(chatMessage)}\n</추가질문>`
    : "";

  const freeTextValue = formData.freeText
    ? `\n<추가의뢰>\n${sanitizeInput(String(formData.freeText))}\n</추가의뢰>`
    : "없음";

  const prompt = `당신은 한국 세법 전문가입니다. 아래 정보를 바탕으로 절세 방안을 분석해주세요.

입력 정보:
- 소득 유형: ${formData.incomeType || "미입력"}
- 연간 소득: ${formData.annualIncome || "미입력"}
- 부양가족 수: ${formData.dependents || "미입력"}
- 주택 보유: ${formData.house || "미입력"}
- 금융소득: ${formData.financialIncome || "미입력"}
- 연금/퇴직소득: ${formData.pension || "미입력"}
- 기납부세액: ${formData.prepaidTax || "미입력"}
- 자유 텍스트: ${freeTextValue}${statuteSection}${chatSection}

절세 방안을 구체적으로 분석하고, 적용 가능한 공제 항목과 예상 절감액을 제시해주세요.`;

  const result = await generateText({
    model,
    prompt,
  });

  return result.text;
}
