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

  if (formData.incomeType) parts.push(String(formData.incomeType));
  if (formData.freeText) parts.push(String(formData.freeText));

  if (formData.house === "다주택") parts.push("종합부동산세");
  if (formData.financialIncome === "500만원 초과") parts.push("금융소득종합과세");
  if (formData.pension === "있음") parts.push("연금소득");

  if (parts.length === 0) parts.push("소득세 절세");

  return parts.join(" ") + " 소득세법";
}
