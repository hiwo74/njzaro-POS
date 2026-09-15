import { useLanguageStore, type Lang } from "../../store/languageStore";
import { en, type Translations } from "./en";
import { ar } from "./ar";

export type { Lang, Translations };

const dictionaries: Record<Lang, Translations> = { en, ar };

export function useT(): Translations {
  const lang = useLanguageStore((s) => s.lang);
  return dictionaries[lang];
}

export function useLang(): Lang {
  return useLanguageStore((s) => s.lang);
}

export function localeFor(lang: Lang): string {
  // -u-nu-latn forces Western digits even in Arabic — keeps dates
  // consistent with formatIqd's Western-numeral currency amounts.
  return lang === "ar" ? "ar-IQ-u-nu-latn" : "en-US";
}
