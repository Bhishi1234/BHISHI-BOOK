import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders modals on document.body so fixed positioning / z-index beat bottom tabs & sheets. */
export function ModalPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("modal-open");
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.classList.remove("modal-open");
    };
  }, []);

  return createPortal(children, document.body);
}
