import { useCallback, useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type A2HSGlobal = {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
};

declare global {
  interface Window {
    __bhishiA2HS?: A2HSGlobal;
  }
}

function bridge(): A2HSGlobal {
  if (!window.__bhishiA2HS) {
    window.__bhishiA2HS = { deferred: null, installed: false };
  }
  return window.__bhishiA2HS;
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mq || ios);
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** True for Safari (iOS or macOS) where programmatic PWA install is unavailable. */
export function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|EdgiOS|FxiOS|OPiOS|Android/i.test(ua);
  return isSafari || (isIosDevice() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua));
}

/** Register SW early so Chrome can fire beforeinstallprompt. */
export async function registerPwaServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

/**
 * Add-to-home-screen / PWA install.
 * Chrome/Edge: one confirmation → native install sheet.
 * iOS Safari: Apple blocks programmatic install — short Share steps only.
 */
export function useAddToHomeScreen() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== "undefined" ? bridge().deferred : null),
  );
  const [installed, setInstalled] = useState(() =>
    typeof window !== "undefined" ? isStandaloneDisplay() || bridge().installed : false,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled(true);
      bridge().installed = true;
      return;
    }

    void registerPwaServiceWorker();

    const syncDeferred = () => {
      const d = bridge().deferred;
      if (d) setDeferred(d);
    };
    syncDeferred();

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      bridge().deferred = ev;
      setDeferred(ev);
    };
    const onInstalled = () => {
      bridge().installed = true;
      bridge().deferred = null;
      setInstalled(true);
      setDeferred(null);
      setConfirmOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    const t = window.setInterval(syncDeferred, 800);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearInterval(t);
    };
  }, []);

  /** Open one-step confirm (or Safari → Chrome hint). Native prompt runs only after user confirms. */
  const openInstall = useCallback(() => {
    if (installed) return;
    // Safari (and iOS Safari) cannot install via API — ask them to use Chrome.
    if (isSafariBrowser() && !bridge().deferred && !deferred) {
      setIosHintOpen(true);
      return;
    }
    setConfirmOpen(true);
  }, [deferred, installed]);

  /** After confirmation — trigger browser install sheet. */
  const confirmInstall = useCallback(async () => {
    setBusy(true);
    try {
      let promptEvent = deferred || bridge().deferred;

      if (!promptEvent) {
        await registerPwaServiceWorker();
        // Give Chrome a short window to become installable after SW activates.
        for (let i = 0; i < 12 && !promptEvent; i++) {
          await new Promise((r) => window.setTimeout(r, 250));
          promptEvent = bridge().deferred;
          if (promptEvent) setDeferred(promptEvent);
        }
      }

      if (promptEvent) {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        bridge().deferred = null;
        setDeferred(null);
        if (outcome === "accepted") {
          bridge().installed = true;
          setInstalled(true);
        }
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      setIosHintOpen(true);
    } catch {
      /* user dismissed browser sheet */
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  return {
    showInstall: !installed,
    hasNativePrompt: Boolean(deferred || (typeof window !== "undefined" && bridge().deferred)),
    isIos: isIosDevice(),
    isSafari: isSafariBrowser(),
    openInstall,
    confirmInstall,
    confirmOpen,
    setConfirmOpen,
    busy,
    iosHintOpen,
    setIosHintOpen,
  };
}
