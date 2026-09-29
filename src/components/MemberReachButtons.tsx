import { Phone } from "lucide-react";
import { useI18n } from "../i18n";
import { canMessagePhone, openCall, openWhatsApp } from "../lib/share";
import { WhatsAppIcon } from "./InviteWhatsAppButton";

export function MemberReachButtons({
  phone,
  whatsappText,
  disabled,
  compact,
  wide,
  showWhatsApp = true,
}: {
  phone?: string | null;
  whatsappText: string;
  disabled?: boolean;
  compact?: boolean;
  wide?: boolean;
  showWhatsApp?: boolean;
}) {
  const { m } = useI18n();
  const ok = canMessagePhone(phone) && !disabled;
  const cls = wide ? "reach-btn" : compact ? "reach-btn reach-btn-sm outline" : "reach-btn";

  return (
    <div className={wide ? "reach-pair" : "reach-actions"} onClick={(e) => e.stopPropagation()}>
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
        <Phone size={compact && !wide ? 14 : 16} strokeWidth={2.3} />
        <span>{m.reach.call}</span>
      </button>
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
          <WhatsAppIcon size={compact && !wide ? 14 : 16} />
          <span>{m.reach.whatsapp}</span>
        </button>
      ) : null}
    </div>
  );
}
