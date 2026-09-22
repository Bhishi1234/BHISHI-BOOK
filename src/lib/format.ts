export function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function inrFull(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function longDate(d = new Date()) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** English defaults for PDF/CSV exports. Prefer useI18n().typeLabel in the UI. */
export const TYPE_LABEL: Record<string, string> = {
  auction: "Auction bhishi",
  fixed: "Fixed / committee",
  base_premium: "Base + premium",
  loan: "Loan bhishi",
  lucky_draw: "Lucky draw (chitthi)",
  hand_sacrifice: "Sacrifice hand",
};

/** English defaults for PDF/CSV. Prefer useI18n().freqLabel in the UI. */
export const FREQ_LABEL: Record<string, string> = {
  daily: "Daily hapta",
  weekly: "Weekly hapta",
  biweekly: "Every 15 days",
  monthly: "Monthly hapta",
  quarterly: "Every 3 months",
  halfyearly: "Every 6 months",
  yearly: "Yearly hapta",
};

export const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  cheque: "Cheque",
  adjusted: "Adjusted from payout",
};

export function chitPath(chit: { id: string; mode: string; viewerRole?: string }) {
  if (chit.viewerRole === "member") return `/member/${chit.id}`;
  return chit.mode === "tracking" ? `/tracked/${chit.id}` : `/chits/${chit.id}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
