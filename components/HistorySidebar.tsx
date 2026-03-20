"use client";

import { useTaxStore } from "@/lib/store/taxStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryItem } from "@/lib/store/taxStore";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return isToday ? `오늘 ${time}` : `${date.toLocaleDateString("ko-KR")} ${time}`;
}

export function HistorySidebar() {
  const history = useTaxStore((s) => s.history);
  const restoreHistory = useTaxStore((s) => s.restoreHistory);

  const handleClick = (item: HistoryItem) => {
    restoreHistory(item);
  };

  return (
    <aside>
      <h2 className="text-lg font-semibold mb-2">히스토리</h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">히스토리가 없습니다</p>
      ) : (
        <ScrollArea>
          <ul role="list">
            {history.map((item) => (
              <li
                key={item.id}
                role="listitem"
                onClick={() => handleClick(item)}
                className="cursor-pointer rounded-md p-2 hover:bg-accent"
              >
                <span className="block text-sm font-medium">
                  {item.form.incomeType || "자유 텍스트"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatTimestamp(item.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </aside>
  );
}
