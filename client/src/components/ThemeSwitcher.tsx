import { useThemeStore } from "../store/themeStore";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`press w-7 h-7 flex items-center justify-center rounded-lg border border-brand-200 text-brand-900 ${className}`}
    >
      {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  );
}
