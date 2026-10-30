"use client";
import { useSyncExternalStore, useId } from "react";
import { SunMoon } from "lucide-react";
let temporaryPreference: string | undefined;

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    applyTheme();
    callback();
  };
  const storageUpdate = () => {
    temporaryPreference = undefined;
    update();
  };
  window.addEventListener("storage", storageUpdate);
  window.addEventListener("leadatlas-theme", update);
  media.addEventListener("change", update);
  return () => {
    window.removeEventListener("storage", storageUpdate);
    window.removeEventListener("leadatlas-theme", update);
    media.removeEventListener("change", update);
  };
}
function preference() {
  if (temporaryPreference) return temporaryPreference;
  try {
    const value = localStorage.getItem("leadatlas-theme");
    return value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}
function applyTheme(value = preference()) {
  document.documentElement.dataset.theme =
    value === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : value;
}
export function ThemeSwitcher() {
  const id = useId();
  const theme = useSyncExternalStore(subscribe, preference, () => "light");
  return (
    <div className="theme-switcher">
      <SunMoon size={16} aria-hidden="true" />
      <label className="sr-only" htmlFor={id}>
        Color theme
      </label>
      <select
        id={id}
        value={theme}
        onChange={(e) => {
          const value = e.target.value;
          try {
            localStorage.setItem("leadatlas-theme", value);
          } catch {
            temporaryPreference = value;
          }
          applyTheme(value as "light" | "dark" | "system");
          window.dispatchEvent(new Event("leadatlas-theme"));
        }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
