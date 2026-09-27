import { useState } from "react";
import { ModalPortal } from "./ModalPortal";
import { useI18n } from "../i18n";
import { useStore } from "../store";

/** Removes a finished bhishi from this user's lists after they confirm. */
export function HideChitButton({ chitId }: { chitId: string }) {
  const { hideChit } = useStore();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        className="link danger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {m.common.delete}
      </button>
      {open && (
        <ModalPortal>
          <div className="modal-back" onClick={() => { if (!busy) setOpen(false); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <h2>{m.chit.hideTitle}</h2>
              <p className="muted">{m.chit.hideBody}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button type="button" className="btn ghost" disabled={busy} onClick={() => setOpen(false)}>
                  {m.common.cancel}
                </button>
                <button
                  type="button"
                  className="btn danger"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void hideChit(chitId)
                      .then(() => setOpen(false))
                      .catch(() => undefined)
                      .finally(() => setBusy(false));
                  }}
                >
                  {busy ? m.common.loading : m.common.delete}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
