"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTaxStore } from "@/lib/store/taxStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Landmark } from "lucide-react";

export function Header() {
  const setDarkMode = useTaxStore((s) => s.setDarkMode);

  // useSyncExternalStore: 서버는 항상 false, 클라이언트는 store에서 읽음
  // → 서버/클라이언트 초기 렌더 일치 보장 (hydration mismatch 방지)
  const darkMode = useSyncExternalStore(
    useTaxStore.subscribe,
    () => useTaxStore.getState().darkMode,
    () => false
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("darkMode");
      if (stored !== null) {
        setDarkMode(JSON.parse(stored) as boolean);
      } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
        setDarkMode(true);
      }
    } catch {}
  }, [setDarkMode]);

  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Landmark className="h-5 w-5" />
        <span>세금 절세 도우미</span>
      </h1>
      <div className="flex items-center gap-2">
        <Label htmlFor="dark-mode-toggle">다크 모드</Label>
        <Switch
          id="dark-mode-toggle"
          aria-label="다크 모드"
          checked={darkMode}
          onCheckedChange={setDarkMode}
        />
      </div>
    </header>
  );
}
