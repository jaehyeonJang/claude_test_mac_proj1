export interface Statute {
  name: string;
  text: string;
}

export async function searchStatutes(query: string): Promise<Statute[]> {
  const apiKey = process.env.LAW_GO_KR_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      OC: apiKey,
      target: "law",
      type: "JSON",
      query,
    });

    const res = await fetch(
      `https://www.law.go.kr/DRF/lawSearch.do?${params.toString()}`
    );

    if (!res.ok) return [];

    const data = await res.json();

    const laws = data?.LawSearch?.law;
    if (!Array.isArray(laws)) return [];

    return laws
      .slice(0, 3)
      .map((law: Record<string, string>) => ({
        name: law.법령명한글 ?? law["법령명한글"] ?? law.lawName ?? "",
        text: law.법령내용 ?? law["법령내용"] ?? law.lawContent ?? "",
      }))
      .filter((s: Statute) => s.name);
  } catch {
    return [];
  }
}

export function buildSearchQuery(formData: Record<string, unknown>): string {
  const parts: string[] = [];

  // incomeTypes 배열 우선, 없으면 하위호환 필드 사용
  const incomeTypes: string[] = Array.isArray(formData.incomeTypes) && (formData.incomeTypes as string[]).length > 0
    ? formData.incomeTypes as string[]
    : [formData.incomeType, formData.incomeType2].filter((t): t is string => !!t && t !== "없음");

  for (const type of incomeTypes) {
    parts.push(type);
    if (type === "양도소득") parts.push("양도소득세");
    if (type === "퇴직소득") parts.push("퇴직소득세");
    if (type === "사업소득") parts.push("사업소득세");
  }

  if (formData.freeText) parts.push(String(formData.freeText));
  if (formData.house === "다주택") parts.push("종합부동산세");
  if (formData.financialIncome === "2000만원 초과") parts.push("금융소득종합과세");
  if (formData.pension === "있음") parts.push("연금소득");
  if (formData.smbEmployeeReduction && formData.smbEmployeeReduction !== "해당없음") parts.push("중소기업취업자소득세감면");

  // 양도소득 상세
  if (formData.capitalGainAdjustedZone === "예") parts.push("다주택중과");

  if (parts.length === 0) parts.push("소득세 절세");

  return parts.join(" ") + " 소득세법";
}
