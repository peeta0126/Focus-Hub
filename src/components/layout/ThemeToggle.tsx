"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/common/Icon";

export type ThemePreference = "dark" | "light" | "system";

const themeEvent = "focus-hub-theme-change";

function getPreference(): ThemePreference {
  const saved = localStorage.getItem("focus-hub-theme");
  return saved === "light" || saved === "system" ? saved : "dark";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => { applyTheme(getPreference()); onChange(); };
  window.addEventListener("storage", update);
  window.addEventListener(themeEvent, update);
  media.addEventListener("change", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(themeEvent, update);
    media.removeEventListener("change", update);
  };
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getPreference, () => "dark" as ThemePreference);

  const select = (value: ThemePreference) => {
    localStorage.setItem("focus-hub-theme", value);
    applyTheme(value);
    window.dispatchEvent(new Event(themeEvent));
  };

  if (expanded) return <fieldset className="theme-options"><legend>화면 테마</legend>{(["dark", "light", "system"] as const).map((value) => <button key={value} type="button" className={theme === value ? "active" : ""} onClick={() => select(value)} aria-pressed={theme === value}><Icon name={value === "dark" ? "moon" : value === "light" ? "sun" : "system"} /><span>{value === "dark" ? "다크" : value === "light" ? "라이트" : "시스템"}</span></button>)}</fieldset>;

  const next: ThemePreference = theme === "dark" ? "light" : "dark";
  return <button type="button" className="icon-button theme-toggle" onClick={() => select(next)} aria-label={`${next === "light" ? "라이트" : "다크"} 모드로 전환`}><Icon name={theme === "light" ? "sun" : "moon"} /></button>;
}
