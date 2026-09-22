import { phone10 } from "./phone";
import { inr } from "./format";
import { isNativeApp } from "./native";

export function digits10Loose(input: string): string {
  return String(input || "").replace(/\D/g, "").slice(-10);
}

export function waMeUrl(phone: string, text: string) {
  const d = digits10Loose(phone);
  if (d.length !== 10) throw new Error("Need a valid 10-digit mobile number");
  return `https://wa.me/91${d}?text=${encodeURIComponent(text)}`;
}

export function telUrl(phone: string) {
  const d = digits10Loose(phone);
  if (d.length !== 10) throw new Error("Need a valid 10-digit mobile number");
  return `tel:+91${d}`;
}

/** Open WhatsApp chat with a prefilled message (app or browser). */
export function openWhatsApp(phone: string, text: string) {
  const url = waMeUrl(phone, text);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openCall(phone: string) {
  window.location.href = telUrl(phone);
}

export function inviteMemberWhatsAppMessage(opts: {
  memberName: string;
  phone: string;
  chitName?: string;
  organiserName?: string;
  instalment?: number;
  appUrl?: string;
}) {
  const app = opts.appUrl || (typeof window !== "undefined" ? window.location.origin : "https://bhishicircle.in");
  const lines = [
    `Namaste ${opts.memberName.trim() || "friend"} 🙏`,
    "",
    opts.chitName
      ? `You have been added to *${opts.chitName}* on Bhishi Circle.`
      : `You have been invited to join Bhishi Circle.`,
  ];
  if (opts.instalment != null && opts.instalment > 0) {
    lines.push(`Hapta (subscription): *${inr(opts.instalment)}*`);
  }
  if (opts.organiserName) {
    lines.push(`Organiser: ${opts.organiserName}`);
  }
  lines.push(
    "",
    `Please open Bhishi Circle and sign in with this same number (+91 ${digits10Loose(opts.phone)}) to see your shared bhishi.`,
    "",
    app,
    "",
    "Thank you!",
  );
  return lines.join("\n");
}

export function dueReminderWhatsAppMessage(opts: {
  memberName: string;
  chitName: string;
  cycle: number;
  duration: number;
  amountDue: number;
  organiserName?: string;
}) {
  const lines = [
    `Namaste ${opts.memberName.trim() || "friend"} 🙏`,
    "",
    `Friendly reminder from *${opts.chitName}* on Bhishi Circle.`,
    "",
    `Your hapta for month *${opts.cycle}* of *${opts.duration}* is pending.`,
    `Amount due: *${inr(opts.amountDue)}*`,
    "",
    "Kindly pay at your earliest convenience so the books stay clear for everyone.",
    "",
    "Thank you for being part of this bhishi!",
  ];
  if (opts.organiserName) {
    lines.push(`— ${opts.organiserName}`);
  }
  return lines.join("\n");
}

export function canMessagePhone(phone: string | null | undefined) {
  return digits10Loose(phone || "").length === 10;
}

/** Soft validate for forms that already use phone10 elsewhere. */
export function tryPhone10(input: string): string | null {
  try {
    return phone10(input);
  } catch {
    const d = digits10Loose(input);
    return d.length === 10 ? d : null;
  }
}

export async function shareText(title: string, text: string) {
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, dialogTitle: title });
      return;
    } catch {
      /* fall through */
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      /* cancelled */
    }
  }
  await navigator.clipboard.writeText(text);
}
