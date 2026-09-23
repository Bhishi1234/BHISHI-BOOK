import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Force the document (and common app scroll parents) back to the top. */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelectorAll(".main-scroll, .main, .page, .shell, #root").forEach((el) => {
    if (el instanceof HTMLElement) el.scrollTop = 0;
  });
}

/**
 * Reset scroll on route change, and again after layout/paint so sticky
 * buttons / focus / late content cannot leave the viewport mid-page.
 */
export function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    // Ignore in-page hash jumps that intentionally target a section.
    if (hash) return;

    scrollPageToTop();
    const frames: number[] = [];
    const timers = [0, 50, 120, 250, 400].map((ms) =>
      window.setTimeout(() => {
        frames.push(window.requestAnimationFrame(scrollPageToTop));
      }, ms),
    );

    return () => {
      for (const t of timers) window.clearTimeout(t);
      for (const f of frames) window.cancelAnimationFrame(f);
    };
  }, [pathname, search, key, hash]);

  return null;
}
