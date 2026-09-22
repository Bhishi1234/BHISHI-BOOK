import { useEffect, useState } from "react";
import { api } from "../api/client";
import { digits10Loose } from "./share";

/** Load which phones already have a Bhishi Circle account. */
export function usePhonesOnApp(phones: Array<string | null | undefined>) {
  const [onApp, setOnApp] = useState<Set<string>>(() => new Set());
  const key = phones
    .map((p) => digits10Loose(p || ""))
    .filter((p) => p.length === 10)
    .sort()
    .join(",");

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    if (!list.length) {
      setOnApp(new Set());
      return;
    }
    void api
      .phonesOnApp(list)
      .then((rows) => {
        if (!cancelled) setOnApp(new Set(rows.map((p) => digits10Loose(p))));
      })
      .catch(() => {
        if (!cancelled) setOnApp(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  function isOnApp(phone?: string | null) {
    const d = digits10Loose(phone || "");
    return d.length === 10 && onApp.has(d);
  }

  return { onApp, isOnApp };
}
