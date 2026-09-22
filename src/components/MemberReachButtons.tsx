import { Phone } from "lucide-react";
import { canMessagePhone, openCall, openWhatsApp } from "../lib/share";
import { WhatsAppIcon } from "./InviteWhatsAppButton";

export function MemberReachButtons({
  phone,
  whatsappText,
  disabled,
  compact,
  /** When false, only the Call button is shown (invite lives next to the name). */
  showWhatsApp = true,
}: {
  phone?: string | null;
  whatsappText: string;
  disabled?: boolean;
  compact?: boolean;
  showWhatsApp?: boolean;
}) {
  const ok = canMessagePhone(phone) && !disabled;
  const cls = compact ? "reach-btn reach-btn-sm" : "reach-btn";

  return (
    <div className="reach-actions" onClick={(e) => e.stopPropagation()}>
      {showWhatsApp ? (
        <button
          type="button"
          className={`${cls} wa`}
          title="WhatsApp"
          disabled={!ok}
          onClick={() => {
            if (!phone || !ok) return;
            openWhatsApp(phone, whatsappText);
          }}
        >
          <WhatsAppIcon size={compact ? 14 : 15} />
          {!compact ? <span>WhatsApp</span> : null}
        </button>
      ) : null}
      <button
        type="button"
        className={`${cls} call`}
        title="Call"
        disabled={!ok}
        onClick={() => {
          if (!phone || !ok) return;
          openCall(phone);
        }}
      >
        <Phone size={compact ? 14 : 15} strokeWidth={2.3} />
        {!compact ? <span>Call</span> : null}
      </button>
    </div>
  );
}
