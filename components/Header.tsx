"use client";

import { useTaxStore } from "@/lib/store/taxStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function Header() {
  const darkMode = useTaxStore((s) => s.darkMode);
  const setDarkMode = useTaxStore((s) => s.setDarkMode);

  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-bold">절세 분석</h1>
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
