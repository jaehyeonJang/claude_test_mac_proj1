"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTaxStore, loadHistory } from "@/lib/store/taxStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface HistorySidebarProps {
  onNewAnalysis?: () => void;
  onRestoreHistory?: () => void;
}

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

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 40;
const DEFAULT_WIDTH = 240;

export function HistorySidebar({ onNewAnalysis, onRestoreHistory }: HistorySidebarProps) {
  const history = useTaxStore((s) => s.history);
  const restoreHistory = useTaxStore((s) => s.restoreHistory);

  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const loaded = loadHistory();
    if (loaded.length > 0) {
      useTaxStore.getState().initHistory(loaded);
    }
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
      setIsResizing(true);
      e.preventDefault();
    },
    [width]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsResizing(false);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const currentWidth = isOpen ? width : COLLAPSED_WIDTH;

  return (
    <aside
      style={{ width: currentWidth }}
      className={`relative border-r flex flex-col overflow-hidden shrink-0 ${
        isResizing ? "" : "transition-[width] duration-200"
      }`}
    >
      {/* Header */}
      <div className="p-2 border-b flex items-center min-h-[49px]">
        {isOpen && <h2 className="text-sm font-semibold flex-1 ml-1">조회 히스토리</h2>}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="p-1 rounded hover:bg-accent ml-auto"
          aria-label={isOpen ? "히스토리 접기" : "히스토리 펼치기"}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <>
          {/* New analysis button at the top */}
          <div className="p-2 border-b">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={onNewAnalysis}
            >
              <Plus className="h-3 w-3" />
              새 분석 시작
            </Button>
          </div>

          {/* History list */}
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <p className="text-sm">분석 기록이 없습니다</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <ul role="list" className="p-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    role="listitem"
                    tabIndex={0}
                    onClick={() => {
                      restoreHistory(item);
                      onRestoreHistory?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        restoreHistory(item);
                        onRestoreHistory?.();
                      }
                    }}
                    className="cursor-pointer rounded-md p-2 hover:bg-accent"
                  >
                    <span className="block text-xs font-medium truncate">
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
        </>
      )}

      {/* Drag handle */}
      {isOpen && (
        <div
          onMouseDown={onMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
        />
      )}
    </aside>
  );
}
