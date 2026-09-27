/** Meta Pixel — loaded only when a tracked front page asks for it. */
const PIXEL_ID = "1989879405056248";

const SIGNUP_FLAG = "bhishi-meta-signup";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: unknown;
    };
    _fbq?: Window["fbq"];
  }
}

let installed = false;

/** Install the base pixel (init only). PageView is sent per screen, not on every app route. */
export function installMetaPixel() {
  if (typeof window === "undefined" || installed || window.fbq) {
    installed = true;
    return;
  }
  installed = true;

  const f = window;
  const b = document;
  const e = "script";
  const v = "https://connect.facebook.net/en_US/fbevents.js";
  const n = (f.fbq = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod.apply(n, args);
    else n.queue?.push(args);
  } as NonNullable<Window["fbq"]>);
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const t = b.createElement(e);
  t.async = true;
  t.src = v;
  const s = b.getElementsByTagName(e)[0];
  s?.parentNode?.insertBefore(t, s);
  f.fbq("init", PIXEL_ID);
}

export function trackMetaPageView() {
  installMetaPixel();
  window.fbq?.("track", "PageView");
}

export function markSignupConversion() {
  try {
    sessionStorage.setItem(SIGNUP_FLAG, "1");
  } catch {
    /* private mode */
  }
}

/** Fires once after a new account is created, then clears the flag. */
export function consumeSignupConversion(): boolean {
  try {
    if (sessionStorage.getItem(SIGNUP_FLAG) !== "1") return false;
    sessionStorage.removeItem(SIGNUP_FLAG);
  } catch {
    return false;
  }
  installMetaPixel();
  window.fbq?.("track", "CompleteRegistration");
  return true;
}

export const META_PIXEL_ID = PIXEL_ID;
