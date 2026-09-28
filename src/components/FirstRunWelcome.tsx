import { useI18n } from "../i18n";
import { ModalPortal } from "./ModalPortal";

export function FirstRunWelcome({
  onCreate,
  onLater,
}: {
  onCreate: () => void;
  onLater: () => void;
}) {
  const { m } = useI18n();
  const copy = m.firstRun;
  return (
    <ModalPortal>
      <div className="first-run-back">
        <div className="first-run-card" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
          <p className="hapta-kicker">Bhishi Circle</p>
          <h2 id="first-run-title">{copy.welcomeTitle}</h2>
          <p>{copy.welcomeBody}</p>
          <button type="button" className="btn wide" onClick={onCreate}>{copy.createBhishi}</button>
          <button type="button" className="hapta-text-btn" onClick={onLater}>{copy.later}</button>
        </div>
      </div>
    </ModalPortal>
  );
}
