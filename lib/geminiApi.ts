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
- 자유 텍스트: ${freeTextValue}${lawNotice}${statuteSection}${chatSection}

절세 방안을 구체적으로 분석하고, 적용 가능한 공제 항목과 예상 절감액을 제시해주세요.`;

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
