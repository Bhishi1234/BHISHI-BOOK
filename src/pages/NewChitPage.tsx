import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookUser } from "lucide-react";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import type { AuctionStyle, ChitType, FixedStyle, Frequency } from "../types";
import { inr } from "../lib/format";
import { computeInstalment } from "../lib/chitMath";
import { pickContactsFromBook, contactsPickerAvailable } from "../lib/contacts";
import { inviteMemberWhatsAppMessage, tryPhone10 } from "../lib/share";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { useStore } from "../store";

const FREQS: Frequency[] = ["daily", "weekly", "biweekly", "monthly", "quarterly", "halfyearly", "yearly"];

function needsStyleStep(type: ChitType) {
  return type === "auction" || type === "fixed";
}

export function NewChitPage() {
  const { customers, addCustomer, addChit, error, user } = useStore();
  const { m, freqLabel, freqHint } = useI18n();
  const nav = useNavigate();
  const canPickContacts = contactsPickerAvailable();
  /** 0 type · 1 style (auction/fixed) · 2 terms · 3 members */
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ChitType>("auction");
  const [auctionStyle, setAuctionStyle] = useState<AuctionStyle>("collect_first");
  const [fixedStyle, setFixedStyle] = useState<FixedStyle>("fixed_order");
  const [pot, setPot] = useState("");
  const [count, setCount] = useState("");
  const [duration, setDuration] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [commKind, setCommKind] = useState<"amount" | "percent">("amount");
  const [comm, setComm] = useState("0");
  const [adjust, setAdjust] = useState<"every_month" | "at_end">("every_month");
  const [interest, setInterest] = useState("5");
  const [tenure, setTenure] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingContacts, setPickingContacts] = useState(false);

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

  const FIXED_STYLES = useMemo(
    () => ([
      { id: "fixed_order" as const, title: m.fixedStyle.fixed_order, body: m.fixedStyle.fixed_order_body },
      { id: "lucky_draw" as const, title: m.fixedStyle.lucky_draw, body: m.fixedStyle.lucky_draw_body },
      { id: "hand_sacrifice" as const, title: m.fixedStyle.hand_sacrifice, body: m.fixedStyle.hand_sacrifice_body },
    ]),
    [m],
  );

  const n = Number(count) || 0;
  const potN = Number(pot) || 0;
  const months = Number(duration) || n;
  const instalment = computeInstalment(potN, n);
  const commPct = commKind === "percent" ? Number(comm) || 0 : potN ? Math.round(((Number(comm) || 0) / potN) * 100) : 0;
  const commMonth = commKind === "amount" ? Number(comm) || 0 : Math.round((potN * (Number(comm) || 0)) / 100);
  const interestN = Number(interest) || 0;
  const tenureN = Number(tenure) || 0;

  async function addFromContacts() {
    setPickingContacts(true);
    try {
      const rows = await pickContactsFromBook({ multiple: true });
      for (const row of rows) {
        const phone = tryPhone10(row.phone);
        if (!phone) continue;
        const existing = customers.find((c) => c.phone === phone);
        if (existing) {
          setPicked((p) => ((!!n && p.length >= n) ? p : [...p, existing.id]));
          continue;
        }
        const created = await addCustomer(row.name.trim() || "Member", phone);
        setPicked((p) => ((!!n && p.length >= n) ? p : [...p, created.id]));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not open contacts";
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
      ? (auctionStyle === "auction_first" ? "Auction first" : "Collect first")
      : type === "fixed"
        ? fixedStyle === "lucky_draw"
          ? "Lucky draw"
          : fixedStyle === "hand_sacrifice"
            ? "Sacrifice hand"
            : "Fixed order"
        : null;

  const preview = useMemo(() => ({
    members: n || "—",
    duration: months ? `${months} months` : "0 months",
    per: instalment ? inr(instalment) : "—",
    commission: commMonth ? inr(commMonth) : "—",
    style: styleLabel,
  }), [n, months, instalment, commMonth, styleLabel]);

  const stepper = needsStyleStep(type)
    ? [
        [m.newChit.pickType, ""],
        [type === "auction" ? m.newChit.auctionStyle : m.newChit.fixedStyle, ""],
        [m.newChit.terms, ""],
        [m.newChit.membersStep, ""],
      ]
    : [
        [m.newChit.pickType, ""],
        [m.newChit.terms, ""],
        [m.newChit.membersStep, ""],
      ];

  const displayStep = needsStyleStep(type) ? step : step === 0 ? 0 : step - 1;

  function goFromType() {
    if (needsStyleStep(type)) setStep(1);
    else setStep(2);
  }

  async function create() {
    if (!n || n < 1) {
      window.alert("Set the number of members / slots first.");
      return;
    }
    if (picked.length !== n) {
      window.alert(`Fill all ${n} slots before creating this chit (currently ${picked.length}). Use + Hand for each seat.`);
      return;
    }
    if (!potN) {
      window.alert("Enter the pot / face amount.");
      return;
    }
    if (type === "loan" && !interestN) {
      window.alert("Enter the monthly interest rate for a loan bhishi.");
      return;
    }
    if (!confirm) {
      window.alert("Confirm that you understand the terms.");
      return;
    }
    setSaving(true);
    try {
      const members = picked.map((customerId, i) => ({ customerId, slot: i + 1 }));
      const typeTitle =
        resolvedType === "lucky_draw"
          ? "Lucky draw"
          : resolvedType === "hand_sacrifice"
            ? "Sacrifice hand"
            : TYPES.find((t) => t.id === type)?.title;
      const id = await addChit({
        name: title.trim() || `${typeTitle} - ${inr(potN)}`,
        title: title.trim() || undefined,
        type: resolvedType,
        frequency: freq,
        pot: potN,
        instalment,
        membersCount: n,
        commissionPct: commPct,
        duration: months || n,
        startDate: start,
        mode: "organise",
        members,
        auctions: [],
        currentCycle: 1,
        commissionKind: commKind,
        commissionValue: Number(comm) || 0,
        adjustmentStyle: type === "auction" ? adjust : "every_month",
        auctionStyle: type === "auction" ? auctionStyle : undefined,
        fixedStyle: type === "fixed" ? fixedStyle : undefined,
        interestRate: type === "loan" ? interestN : undefined,
        repaymentTenure: type === "loan" && tenureN > 0 ? tenureN : undefined,
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
      const tmp = next[from];
      next[from] = next[to];
      next[to] = tmp;
      return next;
    });
  }

  const termsStepLabel = needsStyleStep(type) ? 3 : 2;
  const membersStepLabel = needsStyleStep(type) ? 4 : 3;
  const showPayoutOrder = type === "fixed" && (fixedStyle === "fixed_order" || fixedStyle === "hand_sacrifice");

  function goToTab(i: number) {
    // Only allow jumping back, or to the current step
    if (i <= displayStep) {
      if (needsStyleStep(type)) setStep(i);
      else setStep(i === 0 ? 0 : i + 1);
    }
  }

  return (
    <AppShell crumb={m.nav.chits} crumb2={m.newChit.title}>
      <div className="page new-chit-page">
        <div className="row-head">
          <div>
            <h1>New chit</h1>
            <p className="page-sub">One step at a time — then create your bhishi.</p>
          </div>
          <button className="btn ghost" onClick={() => nav("/chits")}>Cancel</button>
        </div>

        <nav className="wizard-tabs" aria-label="Create steps">
          {stepper.map(([t], i) => {
            const active = i === displayStep;
            const done = i < displayStep;
            return (
              <button
                key={t}
                type="button"
                className={`wizard-tab${active ? " active" : ""}${done ? " done" : ""}`}
                onClick={() => goToTab(i)}
                disabled={i > displayStep}
                aria-current={active ? "step" : undefined}
              >
                <span className="wizard-tab-label">{t}</span>
              </button>
            );
          })}
        </nav>
        {error && <p className="due">{error}</p>}

        {step === 0 && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.pickType}</h2><span className="muted">1 / {stepper.length}</span></div>
            <p className="muted block">{m.newChit.pickType}</p>
            <div className="type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {TYPES.map((t) => (
                <button key={t.id} className={`type-pick ${type === t.id ? "active" : ""}`} onClick={() => setType(t.id)}>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <span />
              <button className="btn" onClick={goFromType}>Next</button>
            </div>
          </div>
        )}

        {step === 1 && type === "auction" && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.auctionStyle}</h2><span className="muted">2 / {stepper.length}</span></div>
            <p className="muted block">{m.auctionStyle.collect_first}</p>
            <div className="type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {AUCTION_STYLES.map((s) => (
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
              <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn" onClick={() => setStep(2)}>Next</button>
            </div>
          </div>
        )}

        {step === 1 && type === "fixed" && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.fixedStyle}</h2><span className="muted">2 / {stepper.length}</span></div>
            <p className="muted block">{m.fixedStyle.fixed_order}</p>
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
              <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn" onClick={() => setStep(2)}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid-2 new-chit-terms">
            <div>
              <div className="card">
                <div className="row-head"><h2>{m.newChit.terms}</h2><span className="muted">{termsStepLabel} / {stepper.length}</span></div>
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
                    <input className="field" placeholder="e.g. 10" value={count} onChange={(e) => { setCount(e.target.value); if (!duration) setDuration(e.target.value); }} />
                  </div>
                  <div>
                    <label className="label">{m.newChit.duration}</label>
                    <input className="field" placeholder="e.g. 10" value={duration} onChange={(e) => setDuration(e.target.value)} />
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
                  <button className={`chip ${commKind === "amount" ? "on" : ""}`} onClick={() => setCommKind("amount")}>₹ Amount</button>
                  <button className={`chip ${commKind === "percent" ? "on" : ""}`} onClick={() => setCommKind("percent")}>% Percentage</button>
                </div>
                <input className="field" value={comm} onChange={(e) => setComm(e.target.value)} />
                <p className="hint">
                  {type === "loan"
                    ? "Taken from cash on hand the first time you give a loan each month."
                    : type === "auction" && auctionStyle === "auction_first"
                      ? "Auction-first settles the winning bid peer-to-peer (bid ÷ members). Foreman commission is not taken from this till."
                      : type === "auction"
                        ? "Taken from the pot each month when you settle the auction (not on the last cycle)."
                        : "Taken from cash on hand when you award the pot."}
                </p>
                {type === "loan" && (
                  <>
                    <label className="label">Interest rate (% per month)</label>
                    <input className="field" value={interest} onChange={(e) => setInterest(e.target.value)} />
                    <div className="quick">
                      {[1, 2, 3, 5, 10].map((v) => (
                        <button key={v} className={`chip ${interest === String(v) ? "on" : ""}`} onClick={() => setInterest(String(v))}>{v}%</button>
                      ))}
                    </div>
                    <p className="hint">One month’s interest is cut from the loan amount when it is given and stays in the pot. More interest is collected with each repayment month, then shared as dividends to the other members at the end.</p>
                    <label className="label">Repayment tenure (months)</label>
                    <input className="field" placeholder="Blank = rest of the chit" value={tenure} onChange={(e) => setTenure(e.target.value)} />
                    <p className="hint">If someone borrows late, repayment is capped to the months left in this bhishi (not longer than the remaining tenure).</p>
                  </>
                )}
                {type === "auction" && auctionStyle === "collect_first" && (
                  <>
                    <label className="label">Adjustment style</label>
                    <div className="seg">
                      <button className={`chip ${adjust === "every_month" ? "on" : ""}`} onClick={() => setAdjust("every_month")}>Every month</button>
                      <button className={`chip ${adjust === "at_end" ? "on" : ""}`} onClick={() => setAdjust("at_end")}>At the end</button>
                    </div>
                  </>
                )}
              </div>

            </div>
            <div className="new-chit-terms-side">
              <div className="card live-preview-card">
                <div className="row-head"><h2>{m.newChit.summary}</h2></div>
                {preview.style && <div className="kv"><span>{m.newChit.fixedStyle}</span><strong>{preview.style}</strong></div>}
                <div className="kv"><span>{m.nav.customers}</span><strong>{preview.members}</strong></div>
                <div className="kv"><span>{m.newChit.duration}</span><strong>{preview.duration}</strong></div>
                <div className="kv"><span>{m.terms.perHapta}</span><strong>{preview.per}</strong></div>
                <div className="kv"><span>{m.terms.commission}</span><strong>{preview.commission}</strong></div>
              </div>
              <div className="card">
                <h2>{m.newChit.settings}</h2>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                  <span><strong>Allow members to view this chit</strong></span>
                </label>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  I understand how this chit works and the details above are correct.
                </label>
                <div className="wizard-actions">
                  <button className="btn ghost" onClick={() => setStep(needsStyleStep(type) ? 1 : 0)}>Back</button>
                  <button
                    className="btn"
                    disabled={!confirm || !potN || !n || (type === "loan" && !interestN)}
                    onClick={() => setStep(3)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <div className="row-head"><h2>{m.newChit.membersStep}</h2><span className="muted">{membersStepLabel} / {stepper.length}</span></div>
            <p className="muted block">
              {showPayoutOrder
                ? fixedStyle === "hand_sacrifice"
                  ? "Order is the usual take sequence — early slots sacrifice one full hand (cash dividends to those still playing). Last slot takes the full pot. Use the arrows to rearrange. The same person can hold more than one hand."
                  : "Order matters — slot 1 is first to receive the pot, then slot 2, and so on. Use the arrows to rearrange. Add another hand for someone who plays twice."
                : fixedStyle === "lucky_draw" && type === "fixed"
                  ? "Members who have not won yet stay in the draw each month. One person can play multiple hands."
                  : "Add people before you start. The same person can take more than one hand — each hand fills one slot and pays its own instalment."}
            </p>

            <div className="add-member-box">
              <strong className="add-member-title">Add new member</strong>
              <div className="grid-2" style={{ marginTop: 10 }}>
                <input className="field" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input className="field" placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="add-member-actions">
                <button
                  className="btn"
                  type="button"
                  disabled={!newName.trim() || (!!n && picked.length >= n)}
                  onClick={async () => {
                    if (!newName.trim()) return;
                    const c = await addCustomer(newName.trim(), newPhone.trim());
                    setPicked((p) => [...p, c.id]);
                    setNewName("");
                    setNewPhone("");
                  }}
                >
                  Add member
                </button>
                {canPickContacts && (
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={pickingContacts || (!!n && picked.length >= n)}
                    onClick={() => void addFromContacts()}
                  >
                    <BookUser size={15} /> {pickingContacts ? "Opening…" : "From contacts"}
                  </button>
                )}
              </div>
            </div>

            <p className="muted" style={{ margin: "16px 0 8px" }}>
              {picked.length} of {n || 0} slots filled.
              {n > 0 && picked.length < n ? " Use + Hand below or add someone new above." : ""}
              {n > 0 && picked.length === n ? " All slots filled — ready to create." : ""}
              {" "}Invite on WhatsApp appears next to people not yet on the app.
            </p>

            {!!customers.length && (
              <div className="section-label" style={{ paddingLeft: 0, paddingTop: 4 }}>Existing members</div>
            )}
            {customers.map((c) => {
              const hands = picked.filter((id) => id === c.id).length;
              const needsInvite = Boolean(c.phone) && !isOnApp(c.phone);
              return (
                <div key={c.id} className="list-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div className="grow">
                    <div className="member-name-row">
                      <strong>{c.name}</strong>
                      {needsInvite ? (
                        <InviteWhatsAppButton
                          phone={c.phone}
                          message={inviteMsg(c.name, c.phone)}
                        />
                      ) : null}
                    </div>
                    <div className="muted">{c.phone}</div>
                    {hands > 0 ? <div className="muted">{hands} hand{hands > 1 ? "s" : ""} in this chit</div> : null}
                  </div>
                  <button
                    type="button"
                    className="btn ghost btn-sm"
                    disabled={hands === 0}
                    onClick={() => {
                      const idx = picked.lastIndexOf(c.id);
                      if (idx >= 0) setPicked((p) => p.filter((_, i) => i !== idx));
                    }}
                  >
                    − Hand
                  </button>
                  <button
                    type="button"
                    className="btn ghost btn-sm"
                    disabled={!!n && picked.length >= n}
                    onClick={() => setPicked((p) => [...p, c.id])}
                  >
                    + Hand
                  </button>
                </div>
              );
            })}
            {showPayoutOrder && !!picked.length && (
              <div className="card" style={{ margin: "12px 0", background: "#f8fafc" }}>
                <strong>Payout order (hands)</strong>
                {picked.map((id, i) => {
                  const c = customers.find((x) => x.id === id);
                  const handNo = picked.slice(0, i + 1).filter((x) => x === id).length;
                  const totalHands = picked.filter((x) => x === id).length;
                  const needsInvite = Boolean(c?.phone) && !isOnApp(c?.phone);
                  return (
                    <div key={`${id}-${i}`} className="list-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <span className="muted">Slot {i + 1}</span>
                      <div className="grow">
                        <div className="member-name-row">
                          <strong>{c?.name}</strong>
                          {totalHands > 1 ? <span className="muted"> · hand {handNo}</span> : null}
                          {needsInvite && c?.phone ? (
                            <InviteWhatsAppButton phone={c.phone} message={inviteMsg(c.name, c.phone)} />
                          ) : null}
                        </div>
                      </div>
                      <button type="button" className="btn ghost btn-sm" disabled={i === 0} onClick={() => movePick(i, -1)}>↑</button>
                      <button type="button" className="btn ghost btn-sm" disabled={i === picked.length - 1} onClick={() => movePick(i, 1)}>↓</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="wizard-actions">
              <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
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
