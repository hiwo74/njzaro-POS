import { useLanguageStore } from "../store/languageStore";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguageStore();

  return (
    <div className={`inline-flex rounded-lg border border-brand-200 overflow-hidden text-xs font-medium ${className}`}>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`press px-2.5 py-1 transition-colors duration-200 ${lang === "en" ? "bg-brand-500 text-white" : "text-brand-900"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`press px-2.5 py-1 transition-colors duration-200 ${lang === "ar" ? "bg-brand-500 text-white" : "text-brand-900"}`}
      >
        AR
      </button>
    </div>
  );
}
