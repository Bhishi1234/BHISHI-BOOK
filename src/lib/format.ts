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

export const TYPE_LABEL: Record<string, string> = {
  auction: "Auction",
  fixed: "Fixed & committee",
  base_premium: "Base + premium",
  loan: "Loan",
  lucky_draw: "Lucky draw",
};

export const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfyearly: "Half Yearly",
  yearly: "Yearly",
};

export const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  cheque: "Cheque",
  adjusted: "Adjusted from payout",
};

export function chitPath(chit: { id: string; mode: string }) {
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
