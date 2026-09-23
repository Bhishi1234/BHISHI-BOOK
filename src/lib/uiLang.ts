export type GuestLang = "en" | "hi" | "mr";

const KEY = "bhishi-ui-lang";

function normalize(raw: string | null | undefined): GuestLang {
  const v = String(raw || "en").toLowerCase().slice(0, 2);
  if (v === "hi") return "hi";
  if (v === "mr") return "mr";
  return "en";
}

/** Guest / pre-login language preference (survives refresh). */
export function getGuestLang(): GuestLang {
  try {
    return normalize(localStorage.getItem(KEY));
  } catch {
    return "en";
  }
}

export function setGuestLang(lang: GuestLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang === "en" ? "en" : lang;
  document.documentElement.dataset.lang = lang;
}
