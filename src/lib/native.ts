import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Native shell bootstrap: status bar, splash, keyboard, Android back button.
 * Safe to call on web — no-ops when not running inside Capacitor.
 */
export async function initNativeShell() {
  if (!isNativeApp()) return () => {};

  document.documentElement.classList.add("native-app");
  document.body.classList.add("native-app");

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0F3746" });
  } catch {
    /* StatusBar not available on all platforms */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* Keyboard plugin optional */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* Splash already hidden */
  }

  const back = await CapApp.addListener("backButton", ({ canGoBack }) => {
    // Let the UI close drawers/modals first (callers preventDefault to claim the event)
    const closeEvt = new CustomEvent("bhishi:hardware-back", { cancelable: true });
    if (!window.dispatchEvent(closeEvt)) return;
    if (canGoBack || window.history.length > 1) {
      window.history.back();
      return;
    }
    void CapApp.exitApp();
  });

  return () => {
    void back.remove();
  };
}
