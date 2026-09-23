import { useState } from "react";
import { ReasonModal } from "./ReasonModal";
import { useI18n } from "../i18n";
import { useStore } from "../store";

/** Opens cancel-reason modal then cancels the chit. */
export function CancelChitButton({
  chitId,
  className = "btn danger",
  label,
  onDone,
}: {
  chitId: string;
  className?: string;
  label?: string;
  onDone?: () => void;
}) {
  const { cancelChit } = useStore();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {label || m.chit.cancelSubmit}
      </button>
      <ReasonModal
        open={open}
        title={m.chit.cancelReasonsTitle}
        hint={m.chit.cancelReasonsHint}
        options={[
          { id: "membersLeft", label: m.chit.cancelReasons.membersLeft },
          { id: "completedEarly", label: m.chit.cancelReasons.completedEarly },
          { id: "disputes", label: m.chit.cancelReasons.disputes },
          { id: "wrongSetup", label: m.chit.cancelReasons.wrongSetup },
          { id: "duplicate", label: m.chit.cancelReasons.duplicate },
          { id: "other", label: m.chit.cancelReasons.other },
        ]}
        otherLabel={m.profile.deleteReasonOther}
        otherPlaceholder={m.profile.deleteReasonOtherPlaceholder}
        confirmLabel={m.chit.cancelSubmit}
        cancelLabel={m.common.cancel}
        multi
        danger
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={async (reasons, note) => {
          setBusy(true);
          try {
            const payload = note ? [...reasons, `note:${note}`] : reasons;
            await cancelChit(chitId, payload);
            setOpen(false);
            onDone?.();
          } catch {
            /* store sets error */
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
