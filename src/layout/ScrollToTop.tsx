import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reset window/document scroll whenever the route changes. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const toTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelectorAll(".main-scroll, .page, .shell").forEach((el) => {
        if (el instanceof HTMLElement) el.scrollTop = 0;
      });
    };
    toTop();
    const id = window.requestAnimationFrame(() => {
      toTop();
      window.requestAnimationFrame(toTop);
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, search]);

  return null;
}
