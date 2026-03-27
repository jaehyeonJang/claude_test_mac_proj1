export interface Statute {
  name: string;
  text: string;
}

async function getLsiSeq(lawName: string): Promise<{ lsiSeq: string; efYd: string; chrClsCd: string } | null> {
  try {
    const res = await fetch(`https://www.law.go.kr/법령/${encodeURIComponent(lawName)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/lsiSeq=(\d+)(?:&amp;|&)chrClsCd=(\w+)(?:&amp;|&)urlMode=lsInfoP(?:&amp;|&)efYd=(\d+)/);
    if (!match) return null;

    return { lsiSeq: match[1], chrClsCd: match[2], efYd: match[3] };
  } catch {
    return null;
  }
}

async function fetchLawContent(lsiSeq: string, chrClsCd: string, efYd: string): Promise<string> {
  const body = new URLSearchParams({ lsiSeq, chrClsCd, efYd, ancYnChk: "0" });
  const res = await fetch("https://www.law.go.kr/LSW/lsInfoR.do", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
  });

  if (!res.ok) return "";

  const html = await res.text();
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5)
    .join("\n")
    .slice(0, 6000);

  return text;
}

export async function fetchLawsByNames(lawNames: string[]): Promise<Statute[]> {
  const results: Statute[] = [];

  for (const name of lawNames.slice(0, 3)) {
    try {
      const info = await getLsiSeq(name);
      if (!info) continue;

      const text = await fetchLawContent(info.lsiSeq, info.chrClsCd, info.efYd);
      if (text) results.push({ name, text });
    } catch {
      continue;
    }
  }

  return results;
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
