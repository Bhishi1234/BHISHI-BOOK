import { useEffect, useMemo } from "react";
import { useStore } from "../store";
import { en } from "./en";
import { hi } from "./hi";
import { mr } from "./mr";
import type { Lang, Messages } from "./types";

export type { Lang, Messages } from "./types";

const CATALOG: Record<Lang, Messages> = { en, hi, mr };

const LOCALE: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export function normalizeLang(raw: string | null | undefined): Lang {
  const v = String(raw || "en").toLowerCase().slice(0, 2);
  if (v === "hi") return "hi";
  if (v === "mr") return "mr";
  return "en";
}

export function messagesFor(lang: Lang): Messages {
  return CATALOG[lang] || en;
}

export function useI18n() {
  const { user } = useStore();
  const lang = normalizeLang(user?.language);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  return useMemo(() => {
    const m = messagesFor(lang);
    const typeLabel = (id: string) => (m.type as Record<string, string>)[id] || id;
    const freqLabel = (id: string) => (m.freq as Record<string, string>)[id] || id;
    const freqHint = (id: string) => (m.freqHint as Record<string, string>)[id] || "";
    const modeLabel = (id: string) => (m.mode as Record<string, string>)[id] || id;
    const statusLabel = (id: string) => (m.status as Record<string, string>)[id] || id;

    const greetingNow = () => {
      const h = new Date().getHours();
      if (h < 12) return m.greeting.morning;
      if (h < 17) return m.greeting.afternoon;
      return m.greeting.evening;
    };

    const longDateNow = (d = new Date()) =>
      d.toLocaleDateString(LOCALE[lang], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return {
      lang,
      m,
      typeLabel,
      freqLabel,
      freqHint,
      modeLabel,
      statusLabel,
      greetingNow,
      longDateNow,
      locale: LOCALE[lang],
    };
  }, [lang]);
}
