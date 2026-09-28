import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { ModalPortal } from "./ModalPortal";

export function FirstRunWelcome({ onCreate }: { onCreate: () => void }) {
  const { m } = useI18n();
  const copy = m.firstRun;
  return (
    <ModalPortal>
      <div className="first-run-back">
        <div className="first-run-card" role="dialog" aria-modal="true" aria-labelledby="first-run-title">
          <p className="hapta-kicker">Bhishi Circle</p>
          <h2 id="first-run-title">{copy.welcomeTitle}</h2>
          <p>{copy.welcomeBody}</p>
          <Link className="btn wide" to="/chits/new" onClick={onCreate}>{copy.createBhishi}</Link>
        </div>
      </div>
    </ModalPortal>
  );
}
