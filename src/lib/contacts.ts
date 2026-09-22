import { Capacitor } from "@capacitor/core";
import { digits10Loose } from "./share";

export type PickedContact = { name: string; phone: string };

type ContactPickerNav = Navigator & {
  contacts?: {
    select: (
      props: string[],
      opts?: { multiple?: boolean },
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

function displayName(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

function firstPhone(raw: unknown): string {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const d = digits10Loose(typeof item === "string" ? item : String((item as { value?: string })?.value || item || ""));
      if (d.length === 10) return d;
    }
    return digits10Loose(String(raw[0] || ""));
  }
  return digits10Loose(String(raw || ""));
}

/** Web Contact Picker API (Chrome Android / some WebViews). */
async function pickViaContactPicker(multiple: boolean): Promise<PickedContact[]> {
  const nav = navigator as ContactPickerNav;
  if (!nav.contacts?.select) return [];
  const rows = await nav.contacts.select(["name", "tel"], { multiple });
  return (rows || [])
    .map((r) => ({
      name: displayName(r.name) || "Member",
      phone: firstPhone(r.tel),
    }))
    .filter((c) => c.phone.length === 10);
}

/** Capacitor community Contacts plugin (native Android/iOS) — one contact per pick. */
async function pickViaCapacitor(_multiple: boolean): Promise<PickedContact[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const { Contacts } = await import("@capacitor-community/contacts");
  const perm = await Contacts.requestPermissions();
  if (perm.contacts !== "granted" && perm.contacts !== "limited") {
    throw new Error("Contacts permission is required to pick members from your phone book.");
  }
  const { contact } = await Contacts.pickContact({
    projection: {
      name: true,
      phones: true,
    },
  });
  if (!contact) return [];
  const name =
    contact.name?.display
    || [contact.name?.given, contact.name?.family].filter(Boolean).join(" ").trim()
    || "Member";
  const phone = firstPhone((contact.phones || []).map((p) => p.number || ""));
  if (phone.length !== 10) {
    throw new Error("That contact needs a valid 10-digit Indian mobile number.");
  }
  return [{ name, phone }];
}

export function contactsPickerAvailable() {
  const nav = navigator as ContactPickerNav;
  return Boolean(nav.contacts?.select) || Capacitor.isNativePlatform();
}

/**
 * Opens the device contact book and returns name + 10-digit phone rows.
 * Prefers native Capacitor Contacts on app builds; falls back to Contact Picker API.
 */
export async function pickContactsFromBook(opts?: { multiple?: boolean }): Promise<PickedContact[]> {
  const multiple = opts?.multiple !== false;
  if (Capacitor.isNativePlatform()) {
    try {
      const rows = await pickViaCapacitor(multiple);
      if (rows.length) return rows;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel|denied|permission/i.test(msg)) throw e;
      // Fall through to web picker
    }
  }
  try {
    const rows = await pickViaContactPicker(multiple);
    if (rows.length) return rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|abort/i.test(msg)) return [];
    throw e;
  }
  throw new Error(
    Capacitor.isNativePlatform()
      ? "Could not open contacts. Allow contacts permission in system settings."
      : "Contact picker is not supported in this browser. Use Chrome on Android, or enter name and phone manually.",
  );
}
