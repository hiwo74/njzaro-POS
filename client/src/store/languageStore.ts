import { create } from "zustand";

export type Lang = "en" | "ar";

const STORAGE_KEY = "njzaro_lang";

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: readStored(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore (private browsing, etc.)
    }
    set({ lang });
  },
}));
