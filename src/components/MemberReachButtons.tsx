import { Phone } from "lucide-react";
import { useI18n } from "../i18n";
import { canMessagePhone, openCall, openWhatsApp } from "../lib/share";
import { WhatsAppIcon } from "./InviteWhatsAppButton";

export function MemberReachButtons({
  phone,
  whatsappText,
  disabled,
  compact,
  showWhatsApp = true,
}: {
  phone?: string | null;
  whatsappText: string;
  disabled?: boolean;
  compact?: boolean;
  showWhatsApp?: boolean;
}) {
  const { m } = useI18n();
  const ok = canMessagePhone(phone) && !disabled;
  const cls = compact ? "reach-btn reach-btn-sm" : "reach-btn";

  return (
    <div className="reach-actions" onClick={(e) => e.stopPropagation()}>
      {showWhatsApp ? (
        <button
          type="button"
          className={`${cls} wa`}
          title={m.reach.whatsapp}
          disabled={!ok}
          onClick={() => {
            if (!phone || !ok) return;
            openWhatsApp(phone, whatsappText);
          }}
        >
          <WhatsAppIcon size={compact ? 14 : 15} />
          {!compact ? <span>{m.reach.whatsapp}</span> : null}
        </button>
      ) : null}
      <button
        type="button"
        className={`${cls} call`}
        title={m.reach.call}
        disabled={!ok}
        onClick={() => {
          if (!phone || !ok) return;
          openCall(phone);
        }}
      >
        <Phone size={compact ? 14 : 15} strokeWidth={2.3} />
        {!compact ? <span>{m.reach.call}</span> : null}
      </button>
    </div>
  );
}
