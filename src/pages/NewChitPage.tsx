import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookUser, Info, Plus, Trash2, UserPlus } from "lucide-react";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { scrollPageToTop } from "../layout/ScrollToTop";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import { PromptBox } from "../components/PromptBox";
import type { AuctionStyle, ChitType, FixedStyle, Frequency } from "../types";
import { inr } from "../lib/format";
import { computeInstalment } from "../lib/chitMath";
import { pickContactsFromBook } from "../lib/contacts";
import { inviteMemberWhatsAppMessage, tryPhone10 } from "../lib/share";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { useStore } from "../store";

const FREQS: Frequency[] = ["biweekly", "monthly"];

type Phase = "type" | "variant" | "collect" | "terms" | "members";

function phasesFor(type: ChitType): Phase[] {
  if (type === "fixed") return ["type", "variant", "collect", "terms", "members"];
  if (type === "auction" || type === "loan") return ["type", "collect", "terms", "members"];
  return ["type", "terms", "members"];
}

export function NewChitPage() {
  const { customers, addCustomer, addChit, error, user } = useStore();
  const { m, tx, freqLabel, freqHint, typeLabel } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ChitType>("auction");
  const [auctionStyle, setAuctionStyle] = useState<AuctionStyle>("collect_first");
  const [fixedStyle, setFixedStyle] = useState<FixedStyle>("fixed_order");
  const [pot, setPot] = useState("");
  const [count, setCount] = useState("");
  const [duration, setDuration] = useState("");
  const [durationManual, setDurationManual] = useState(false);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [commKind, setCommKind] = useState<"amount" | "percent">("amount");
  const [comm, setComm] = useState("0");
  const [adjust, setAdjust] = useState<"every_month" | "at_end">("every_month");
  const [tenure, setTenure] = useState("");
  const [loanPrincipalMode, setLoanPrincipalMode] = useState<"emi" | "end">("emi");
  const [loanInterestUpfront, setLoanInterestUpfront] = useState(true);
  const [visible, setVisible] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [manualHands, setManualHands] = useState(1);
  const [existingPick, setExistingPick] = useState("");
  const [existingHands, setExistingHands] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pickingContacts, setPickingContacts] = useState(false);
  const [memberHelpOpen, setMemberHelpOpen] = useState(false);

  const { isOnApp } = usePhonesOnApp(customers.map((c) => c.phone));

  const TYPES = useMemo(
    () => ([
      { id: "auction" as const, title: m.type.auction, body: m.typeBody.auction },
      { id: "fixed" as const, title: m.type.fixed, body: m.typeBody.fixed },
      { id: "loan" as const, title: m.type.loan, body: m.typeBody.loan },
    ]),
    [m],
  );

  const AUCTION_STYLES = useMemo(
    () => ([
      { id: "collect_first" as const, title: m.auctionStyle.collect_first, body: m.auctionStyle.collect_first_body },
      { id: "auction_first" as const, title: m.auctionStyle.auction_first, body: m.auctionStyle.auction_first_body },
    ]),
    [m],
  );

  const SETTLEMENT_STYLES = useMemo(
    () => ([
      { id: "collect_first" as const, title: m.settlementStyle.collect_first, body: m.settlementStyle.collect_first_body },
      { id: "auction_first" as const, title: m.settlementStyle.award_first, body: m.settlementStyle.award_first_body },
    ]),
    [m],
  );

  const FIXED_STYLES = useMemo(
    () => ([
      { id: "fixed_order" as const, title: m.fixedStyle.fixed_order, body: m.fixedStyle.fixed_order_body },
      { id: "lucky_draw" as const, title: m.fixedStyle.lucky_draw, body: m.fixedStyle.lucky_draw_body },
      { id: "hand_sacrifice" as const, title: m.fixedStyle.hand_sacrifice, body: m.fixedStyle.hand_sacrifice_body },
    ]),
    [m],
  );

  const phases = phasesFor(type);
  const phase = phases[Math.min(step, phases.length - 1)]!;

  const n = Number(count) || 0;
  const potN = Number(pot) || 0;
  const months = Number(duration) || n;
  const instalment = computeInstalment(potN, n);
  const commPct = commKind === "percent" ? Number(comm) || 0 : potN ? Math.round(((Number(comm) || 0) / potN) * 100) : 0;
  const commMonth = commKind === "amount" ? Number(comm) || 0 : Math.round((potN * (Number(comm) || 0)) / 100);
  const tenureN = Number(tenure) || 0;
  const slotsFull = !!n && picked.length >= n;
  const slotsLeft = n > 0 ? Math.max(0, n - picked.length) : 99;
  const maxHandsPick = Math.max(1, slotsLeft || 1);

  useEffect(() => {
    setManualHands((v) => Math.min(Math.max(1, v), maxHandsPick));
    setExistingHands((v) => Math.min(Math.max(1, v), maxHandsPick));
  }, [maxHandsPick]);

  async function addFromContacts() {
    setPickingContacts(true);
    try {
      const rows = await pickContactsFromBook({ multiple: true });
      for (const row of rows) {
        const phone = tryPhone10(row.phone);
        if (!phone) continue;
        let customerId = customers.find((c) => c.phone === phone)?.id;
        if (!customerId) {
          const created = await addCustomer(row.name.trim() || m.common.member, phone);
          customerId = created.id;
        }
        setPicked((p) => (n > 0 && p.length >= n ? p : [...p, customerId!]));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : m.chit.couldNotOpenContacts;
      window.alert(msg);
    } finally {
      setPickingContacts(false);
    }
  }

  function inviteMsg(name: string, phone: string) {
    return inviteMemberWhatsAppMessage({
      memberName: name,
      phone,
      chitName: title.trim() || undefined,
      organiserName: user?.name,
      instalment: instalment || undefined,
    });
  }

  const resolvedType: ChitType =
    type === "fixed"
      ? fixedStyle === "lucky_draw"
        ? "lucky_draw"
        : fixedStyle === "hand_sacrifice"
          ? "hand_sacrifice"
          : "fixed"
      : type;
  const styleLabel =
    type === "auction"
      ? (auctionStyle === "auction_first" ? m.auctionStyle.auction_first : m.auctionStyle.collect_first)
      : type === "fixed"
        ? `${fixedStyle === "lucky_draw"
          ? m.fixedStyle.lucky_draw
          : fixedStyle === "hand_sacrifice"
            ? m.fixedStyle.hand_sacrifice
            : m.fixedStyle.fixed_order} · ${auctionStyle === "auction_first" ? m.settlementStyle.award_first : m.settlementStyle.collect_first}`
        : type === "loan"
          ? (auctionStyle === "auction_first" ? m.settlementStyle.award_first : m.settlementStyle.collect_first)
          : null;

  const preview = useMemo(() => ({
    members: n || "—",
    duration: months ? tx(m.newChitExtra.monthsCount, { n: months }) : m.newChitExtra.monthsZero,
    per: instalment ? inr(instalment) : "—",
    commission: commMonth ? inr(commMonth) : "—",
    style: styleLabel,
  }), [n, months, instalment, commMonth, styleLabel, m, tx]);

  function phaseLabel(p: Phase) {
    if (p === "type") return m.newChit.pickType;
    if (p === "variant") return m.newChit.fixedStyle;
    if (p === "collect") {
      return type === "auction" ? m.newChit.auctionStyle : m.settlementStyle.title;
    }
    if (p === "terms") return m.newChit.terms;
    return m.newChit.membersStep;
  }

  const stepper = phases.map(phaseLabel);

  function goToTab(i: number) {
    if (i <= step) {
      setStep(i);
      scrollPageToTop();
    }
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    scrollPageToTop();
  }

  function goNext() {
    setStep((s) => Math.min(phases.length - 1, s + 1));
    scrollPageToTop();
  }

  useEffect(() => {
    scrollPageToTop();
    const t = window.setTimeout(scrollPageToTop, 80);
    return () => window.clearTimeout(t);
  }, [step, phase]);

  async function create() {
    if (!n || n < 1) {
      window.alert(m.newChitExtra.setMembersAlert);
      return;
    }
    const haptaN = Number(duration) || 0;
    if (haptaN !== n) {
      window.alert(tx(m.newChitExtra.haptasMustMatchHands, { hands: n }));
      return;
    }
    if (picked.length !== n) {
      window.alert(tx(m.newChitExtra.fillSlotsAlert, { n, filled: picked.length }));
      return;
    }
    if (!potN) {
      window.alert(m.newChitExtra.enterPotAlert);
      return;
    }
    if (!confirm) {
      window.alert(m.newChitExtra.confirmAlert);
      return;
    }
    setSaving(true);
    try {
      const members = picked.map((customerId, i) => ({ customerId, slot: i + 1 }));
      const typeTitle = typeLabel(resolvedType) || TYPES.find((t) => t.id === type)?.title;
      const id = await addChit({
        name: title.trim() || `${typeTitle} - ${inr(potN)}`,
        title: title.trim() || undefined,
        type: resolvedType,
        frequency: freq,
        pot: potN,
        instalment,
        membersCount: n,
        commissionPct: commPct,
        duration: haptaN,
        startDate: start,
        mode: "organise",
        members,
        auctions: [],
        currentCycle: 1,
        commissionKind: commKind,
        commissionValue: Number(comm) || 0,
        adjustmentStyle: type === "auction" ? adjust : "every_month",
        auctionStyle,
        fixedStyle: type === "fixed" ? fixedStyle : undefined,
        repaymentTenure: type === "loan" && tenureN > 0 ? tenureN : undefined,
        loanPrincipalMode: type === "loan" ? loanPrincipalMode : undefined,
        loanInterestUpfront: type === "loan" ? loanInterestUpfront : undefined,
        remindDays: [],
        memberVisible: visible,
      });
      nav(`/chits/${id}`);
    } finally {
      setSaving(false);
    }
  }

  function movePick(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= picked.length) return;
    setPicked((xs) => {
      const next = [...xs];
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      return next;
    });
  }

  function removePickAt(idx: number) {
    setPicked((p) => p.filter((_, i) => i !== idx));
  }

  async function addManualMember() {
    if (!newName.trim() || slotsFull) return;
    const hands = Math.min(Math.max(1, manualHands), slotsLeft);
    const c = await addCustomer(newName.trim(), newPhone.trim());
    setPicked((p) => [...p, ...Array.from({ length: hands }, () => c.id)]);
    setNewName("");
    setNewPhone("");
    setManualHands(1);
  }

  function addExistingMember() {
    if (!existingPick || slotsFull) return;
    const hands = Math.min(Math.max(1, existingHands), slotsLeft);
    setPicked((p) => [...p, ...Array.from({ length: hands }, () => existingPick)]);
    setExistingPick("");
    setExistingHands(1);
  }

  function bumpHands(kind: "manual" | "existing", delta: number) {
    const setter = kind === "manual" ? setManualHands : setExistingHands;
    setter((v) => Math.min(maxHandsPick, Math.max(1, v + delta)));
  }

  function setHands(kind: "manual" | "existing", raw: string) {
    const setter = kind === "manual" ? setManualHands : setExistingHands;
    const num = Math.floor(Number(raw) || 0);
    if (!num) {
      setter(1);
      return;
    }
    setter(Math.min(maxHandsPick, Math.max(1, num)));
  }

  const showPayoutOrder = type === "fixed" && (fixedStyle === "fixed_order" || fixedStyle === "hand_sacrifice");
  const memberHelp = showPayoutOrder
    ? fixedStyle === "hand_sacrifice"
      ? m.newChitExtra.memberHelpSacrifice
      : m.newChitExtra.memberHelpFixedOrder
    : fixedStyle === "lucky_draw" && type === "fixed"
      ? m.newChitExtra.memberHelpLuckyDraw
      : m.newChitExtra.memberHelpDefault;

  const availableExisting = customers;

  return (
    <AppShell crumb={m.nav.chits} crumb2={m.newChit.title}>
      <div className="page new-chit-page">
        <div className="row-head">
          <div>
            <h1>{m.newChit.title}</h1>
            <p className="page-sub">{m.newChitExtra.pageSubtitle}</p>
          </div>
          <button className="btn ghost" onClick={() => nav("/chits")}>{m.common.cancel}</button>
        </div>

        <nav className="wizard-tabs" aria-label={m.newChitExtra.createStepsAria}>
          {stepper.map((t, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={`${t}-${i}`}
                type="button"
                className={`wizard-tab${active ? " active" : ""}${done ? " done" : ""}`}
                onClick={() => goToTab(i)}
                disabled={i > step}
                aria-current={active ? "step" : undefined}
              >
                <span className="wizard-tab-label">{t}</span>
              </button>
            );
          })}
        </nav>
        {error && <p className="due">{error}</p>}

        {phase === "type" && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.pickType}</h2><span className="muted">1 / {stepper.length}</span></div>
            <div className="type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`type-pick ${type === t.id ? "active" : ""}`}
                  onClick={() => {
                    setType(t.id);
                    setStep(0);
                  }}
                >
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <span />
              <button className="btn" onClick={goNext}>{m.common.next}</button>
            </div>
          </div>
        )}

        {phase === "variant" && type === "fixed" && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.fixedStyle}</h2><span className="muted">{step + 1} / {stepper.length}</span></div>
            <div className="type-row" style={{ gridTemplateColumns: "1fr" }}>
              {FIXED_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`type-pick ${fixedStyle === s.id ? "active" : ""}`}
                  onClick={() => setFixedStyle(s.id)}
                >
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button className="btn ghost" onClick={goBack}>{m.common.back}</button>
              <button className="btn" onClick={goNext}>{m.common.next}</button>
            </div>
          </div>
        )}

        {phase === "collect" && (
          <div className="card">
            <div className="row-head">
              <h2>{type === "auction" ? m.newChit.auctionStyle : m.settlementStyle.title}</h2>
              <span className="muted">{step + 1} / {stepper.length}</span>
            </div>
            <p className="muted block">
              {type === "auction" ? m.auctionStyle.collect_first : m.settlementStyle.collect_first}
            </p>
            <div className="type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(type === "auction" ? AUCTION_STYLES : SETTLEMENT_STYLES).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`type-pick ${auctionStyle === s.id ? "active" : ""}`}
                  onClick={() => setAuctionStyle(s.id)}
                >
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button className="btn ghost" onClick={goBack}>{m.common.back}</button>
              <button className="btn" onClick={goNext}>{m.common.next}</button>
            </div>
          </div>
        )}

        {phase === "terms" && (
          <div className="grid-2 new-chit-terms">
            <div>
              <div className="card">
                <div className="row-head"><h2>{m.newChit.terms}</h2><span className="muted">{step + 1} / {stepper.length}</span></div>
                <div className="grid-2">
                  <div>
                    <label className="label">{m.terms.bhishiAmount}</label>
                    <input className="field" placeholder="e.g. 100000" value={pot} onChange={(e) => setPot(e.target.value)} />
                    <div className="quick">
                      {[100000, 200000, 500000].map((v) => (
                        <button key={v} className={`chip ${pot === String(v) ? "on" : ""}`} onClick={() => setPot(String(v))}>{inr(v)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">{m.newChit.memberCount}</label>
                    <input
                      className="field"
                      placeholder="e.g. 10"
                      inputMode="numeric"
                      value={count}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, "");
                        setCount(next);
                        if (!durationManual) setDuration(next);
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">{m.newChit.duration}</label>
                    <input
                      className="field"
                      placeholder="e.g. 10"
                      inputMode="numeric"
                      value={duration}
                      onChange={(e) => {
                        setDurationManual(true);
                        setDuration(e.target.value.replace(/\D/g, ""));
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">{m.newChit.startDate}</label>
                    <input className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                </div>
                <label className="label">{m.newChit.groupName}</label>
                <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={m.newChit.groupNameHint} />
                <label className="label">{m.newChit.frequency}</label>
                <p className="muted" style={{ marginBottom: 8 }}>{m.newChit.frequencyHint}</p>
                <div className="seg block">
                  {FREQS.map((f) => (
                    <button key={f} type="button" title={freqHint(f)} className={`chip ${freq === f ? "on" : ""}`} onClick={() => setFreq(f)}>{freqLabel(f)}</button>
                  ))}
                </div>
                {freqHint(freq) ? <p className="muted" style={{ marginTop: 8 }}>{freqHint(freq)}</p> : null}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <h2>{m.terms.collected}</h2>
                <label className="label">{m.terms.commission}</label>
                <div className="seg" style={{ marginBottom: 12 }}>
                  <button className={`chip ${commKind === "amount" ? "on" : ""}`} onClick={() => setCommKind("amount")}>{m.newChitExtra.amountKind}</button>
                  <button className={`chip ${commKind === "percent" ? "on" : ""}`} onClick={() => setCommKind("percent")}>{m.newChitExtra.percentKind}</button>
                </div>
                <input className="field" value={comm} onChange={(e) => setComm(e.target.value)} />
                <PromptBox tone="amber">
                  {type === "loan"
                    ? m.newChitExtra.commissionFromTill
                    : type === "auction" && auctionStyle === "auction_first"
                      ? m.newChitExtra.commissionAuctionFirstPeer
                      : type === "auction"
                        ? m.newChitExtra.commissionAuctionFirst
                        : m.newChitExtra.commissionCollectFirst}
                </PromptBox>
                {type === "loan" && (
                  <>
                    <PromptBox tone="blue">{m.newChitExtra.interestOnAwardHint}</PromptBox>
                    <label className="label">{m.newChitExtra.interestCutLabel}</label>
                    <div className="seg" style={{ marginBottom: 8 }}>
                      <button type="button" className={`chip ${loanInterestUpfront ? "on" : ""}`} onClick={() => setLoanInterestUpfront(true)}>
                        {m.newChitExtra.interestCutAtGive}
                      </button>
                      <button type="button" className={`chip ${!loanInterestUpfront ? "on" : ""}`} onClick={() => setLoanInterestUpfront(false)}>
                        {m.newChitExtra.interestCutNextMonth}
                      </button>
                    </div>
                    <PromptBox tone="teal">
                      {loanInterestUpfront ? m.newChitExtra.interestCutAtGiveHint : m.newChitExtra.interestCutNextMonthHint}
                    </PromptBox>
                    <label className="label">{m.newChitExtra.repaymentTenureLabel}</label>
                    <input className="field" placeholder={m.newChitExtra.blankRestOfChit} value={tenure} onChange={(e) => setTenure(e.target.value)} />
                    <PromptBox tone="blue">{m.newChitExtra.repaymentCapHint}</PromptBox>
                    <label className="label">{m.newChitExtra.principalModeLabel}</label>
                    <div className="seg" style={{ marginBottom: 8 }}>
                      <button type="button" className={`chip ${loanPrincipalMode === "emi" ? "on" : ""}`} onClick={() => setLoanPrincipalMode("emi")}>
                        {m.newChitExtra.principalEmi}
                      </button>
                      <button type="button" className={`chip ${loanPrincipalMode === "end" ? "on" : ""}`} onClick={() => setLoanPrincipalMode("end")}>
                        {m.newChitExtra.principalAtEnd}
                      </button>
                    </div>
                    <PromptBox tone="amber">
                      {loanPrincipalMode === "end" ? m.newChitExtra.principalAtEndHint : m.newChitExtra.principalEmiHint}
                    </PromptBox>
                  </>
                )}
                {type === "auction" && auctionStyle === "collect_first" && (
                  <>
                    <label className="label">{m.newChitExtra.adjustmentStyle}</label>
                    <div className="seg">
                      <button className={`chip ${adjust === "every_month" ? "on" : ""}`} onClick={() => setAdjust("every_month")}>{m.newChitExtra.everyMonth}</button>
                      <button className={`chip ${adjust === "at_end" ? "on" : ""}`} onClick={() => setAdjust("at_end")}>{m.newChitExtra.atEnd}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="new-chit-terms-side">
              <div className="card live-preview-card">
                <div className="row-head"><h2>{m.newChit.summary}</h2></div>
                <div className="summary-grid">
                  {preview.style && (
                    <div className="summary-cell summary-cell-wide">
                      <span className="summary-label">
                        {type === "auction" ? m.newChit.auctionStyle : type === "fixed" ? m.newChit.fixedStyle : m.settlementStyle.title}
                      </span>
                      <strong className="summary-value">{preview.style}</strong>
                    </div>
                  )}
                  <div className="summary-cell">
                    <span className="summary-label">{m.nav.customers}</span>
                    <strong className="summary-value">{preview.members}</strong>
                  </div>
                  <div className="summary-cell">
                    <span className="summary-label">{m.newChit.duration}</span>
                    <strong className="summary-value">{preview.duration}</strong>
                  </div>
                  <div className="summary-cell">
                    <span className="summary-label">{m.terms.perHapta}</span>
                    <strong className="summary-value">{preview.per}</strong>
                  </div>
                  <div className="summary-cell">
                    <span className="summary-label">{m.terms.commission}</span>
                    <strong className="summary-value">{preview.commission}</strong>
                  </div>
                </div>
              </div>
              <div className="card">
                <h2>{m.newChit.settings}</h2>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                  <span><strong>{m.newChit.memberVisible}</strong></span>
                </label>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  {m.newChitExtra.confirmCheckbox}
                </label>
                <div className="wizard-actions">
                  <button className="btn ghost" onClick={goBack}>{m.common.back}</button>
                  <button
                    className="btn"
                    disabled={!confirm || !potN || !n}
                    onClick={() => {
                      const haptaN = Number(duration) || 0;
                      if (haptaN !== n) {
                        window.alert(tx(m.newChitExtra.haptasMustMatchHands, { hands: n }));
                        return;
                      }
                      goNext();
                    }}
                  >
                    {m.common.next}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "members" && (
          <div className="card members-wizard">
            <div className="row-head members-wizard-head">
              <div className="members-title-row">
                <h2>{m.newChit.membersStep}</h2>
                <button
                  type="button"
                  className={`info-chip${memberHelpOpen ? " on" : ""}`}
                  aria-expanded={memberHelpOpen}
                  aria-controls="members-help-panel"
                  aria-label={m.newChitExtra.membersInfoAria}
                  title={m.newChitExtra.membersInfoAria}
                  onClick={() => setMemberHelpOpen((v) => !v)}
                >
                  <Info size={15} strokeWidth={2.4} />
                </button>
              </div>
              <span className="muted">{step + 1} / {stepper.length}</span>
            </div>
            {memberHelpOpen && (
              <div id="members-help-panel" className="members-help-panel">
                <PromptBox tone="blue">{memberHelp}</PromptBox>
              </div>
            )}
            <p className="members-slot-meta">
              {tx(m.newChitExtra.slotsFilled, { filled: picked.length, total: n || 0 })}
              {n > 0 && picked.length < n ? ` · ${m.newChitExtra.useHandBelow}` : ""}
              {n > 0 && picked.length === n ? ` · ${m.newChitExtra.allSlotsReady}` : ""}
            </p>

            {picked.length > 0 && (
              <div className="picked-list">
                {picked.map((id, i) => {
                  const c = customers.find((x) => x.id === id);
                  const handNo = picked.slice(0, i + 1).filter((x) => x === id).length;
                  const totalHands = picked.filter((x) => x === id).length;
                  const needsInvite = Boolean(c?.phone) && !isOnApp(c?.phone);
                  return (
                    <div key={`${id}-${i}`} className="picked-row">
                      <span className="picked-slot">{tx(m.newChitExtra.slotN, { n: i + 1 })}</span>
                      <div className="grow">
                        <div className="member-name-row">
                          <strong>{c?.name || id}</strong>
                          {totalHands > 1 ? <span className="muted"> · {tx(m.chit.handOf, { n: handNo })}</span> : null}
                          {needsInvite && c?.phone ? (
                            <InviteWhatsAppButton phone={c.phone} message={inviteMsg(c.name, c.phone)} />
                          ) : null}
                        </div>
                        {c?.phone ? <div className="muted">{c.phone}</div> : null}
                      </div>
                      {showPayoutOrder && (
                        <>
                          <button type="button" className="btn ghost btn-sm" disabled={i === 0} onClick={() => movePick(i, -1)}>↑</button>
                          <button type="button" className="btn ghost btn-sm" disabled={i === picked.length - 1} onClick={() => movePick(i, 1)}>↓</button>
                        </>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={m.newChitExtra.removeHand}
                        onClick={() => removePickAt(i)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="member-source-cards">
              <div className="member-source-card tone-new">
                <div className="member-source-head">
                  <span className="member-source-icon" aria-hidden><Plus size={16} /></span>
                  <strong className="add-member-title">{m.newChitExtra.addNewMember}</strong>
                </div>
                <div className="member-source-fields">
                  <input className="field" placeholder={m.profile.name} value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <input className="field" placeholder={m.profile.phone} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
                <div className="hands-stepper">
                  <span className="hands-stepper-label">{m.newChitExtra.noOfHands}</span>
                  <div className="hands-stepper-controls">
                    <button
                      type="button"
                      className="btn ghost hands-stepper-btn"
                      disabled={slotsFull || manualHands <= 1}
                      onClick={() => bumpHands("manual", -1)}
                      aria-label="−"
                    >
                      −
                    </button>
                    <input
                      className="field hands-stepper-input"
                      inputMode="numeric"
                      value={manualHands}
                      disabled={slotsFull}
                      onChange={(e) => setHands("manual", e.target.value)}
                      aria-label={m.newChitExtra.noOfHands}
                    />
                    <button
                      type="button"
                      className="btn ghost hands-stepper-btn"
                      disabled={slotsFull || manualHands >= maxHandsPick}
                      onClick={() => bumpHands("manual", 1)}
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="btn wide"
                  type="button"
                  disabled={!newName.trim() || slotsFull}
                  onClick={() => void addManualMember()}
                >
                  <Plus size={15} /> {m.newChit.addMember}
                </button>
              </div>

              <div className="member-source-card tone-existing">
                <div className="member-source-head">
                  <span className="member-source-icon" aria-hidden><UserPlus size={16} /></span>
                  <strong className="add-member-title">{m.newChitExtra.addFromExisting}</strong>
                </div>
                <div className="member-add-stack">
                  <select
                    className="field"
                    value={existingPick}
                    disabled={slotsFull || !availableExisting.length}
                    onChange={(e) => setExistingPick(e.target.value)}
                  >
                    <option value="">{m.newChitExtra.chooseExisting}</option>
                    {availableExisting.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.phone ? ` · ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="hands-stepper">
                    <span className="hands-stepper-label">{m.newChitExtra.noOfHands}</span>
                    <div className="hands-stepper-controls">
                      <button
                        type="button"
                        className="btn ghost hands-stepper-btn"
                        disabled={slotsFull || existingHands <= 1}
                        onClick={() => bumpHands("existing", -1)}
                        aria-label="−"
                      >
                        −
                      </button>
                      <input
                        className="field hands-stepper-input"
                        inputMode="numeric"
                        value={existingHands}
                        disabled={slotsFull}
                        onChange={(e) => setHands("existing", e.target.value)}
                        aria-label={m.newChitExtra.noOfHands}
                      />
                      <button
                        type="button"
                        className="btn ghost hands-stepper-btn"
                        disabled={slotsFull || existingHands >= maxHandsPick}
                        onClick={() => bumpHands("existing", 1)}
                        aria-label="+"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost wide"
                    disabled={!existingPick || slotsFull}
                    onClick={addExistingMember}
                  >
                    <UserPlus size={15} /> {m.newChit.addHand}
                  </button>
                </div>

                <div className="member-phonebook">
                  <button
                    className="btn ghost wide"
                    type="button"
                    disabled={pickingContacts || slotsFull}
                    onClick={() => void addFromContacts()}
                  >
                    <BookUser size={15} /> {pickingContacts ? m.newChitExtra.opening : m.newChitExtra.fromPhonebook}
                  </button>
                  <p className="member-phonebook-hint">{m.newChitExtra.fromContacts}</p>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn ghost" onClick={goBack}>{m.common.back}</button>
              <button
                className="btn"
                disabled={saving || !n || picked.length !== n}
                onClick={() => void create()}
              >
                {saving ? m.newChit.creating : m.newChit.create}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
