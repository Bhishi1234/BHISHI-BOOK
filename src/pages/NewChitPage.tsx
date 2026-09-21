import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import type { AuctionStyle, ChitType, FixedStyle, Frequency } from "../types";
import { FREQ_LABEL, inr } from "../lib/format";
import { computeInstalment } from "../lib/chitMath";
import { useStore } from "../store";

const TYPES: { id: ChitType; title: string; body: string }[] = [
  { id: "auction", title: "Auction", body: "Members bid each cycle; winner takes the pot. Choose collect-first or auction-first next." },
  { id: "fixed", title: "Fixed", body: "Same dues every month. Choose fixed order, lucky draw, or sacrifice hand next." },
  { id: "loan", title: "Loan", body: "Member takes a loan; then pays deposit + interest on principal + principal share." },
];

const AUCTION_STYLES: { id: AuctionStyle; title: string; body: string }[] = [
  {
    id: "collect_first",
    title: "Collect first, then auction",
    body: "Gather this month’s contributions into the pot, then run the auction. Winner takes their bid from cash on hand; discount becomes dividend.",
  },
  {
    id: "auction_first",
    title: "Auction first, then collect",
    body: "Run the auction first (e.g. winner wants ₹95,000 of a ₹1,00,000 pot). Everyone then pays bid ÷ members. Face value stays the full pot each month.",
  },
];

const FIXED_STYLES: { id: FixedStyle; title: string; body: string }[] = [
  {
    id: "fixed_order",
    title: "Fixed order",
    body: "Payout follows the member slot list you set (slot 1 first, then 2, and so on). Same monthly due for everyone.",
  },
  {
    id: "lucky_draw",
    title: "Lucky draw",
    body: "Each month, roll among members who have not yet won. Same monthly due for everyone — no premium or extra after win.",
  },
  {
    id: "hand_sacrifice",
    title: "Sacrifice hand",
    body: "Early winners take the pot minus one full instalment; that cut is paid as cash dividends to members still playing. The last member takes the full pot. Lucky draw available if no one steps up.",
  },
];

const FREQS: Frequency[] = ["daily", "weekly", "biweekly", "monthly", "quarterly", "halfyearly", "yearly"];

function needsStyleStep(type: ChitType) {
  return type === "auction" || type === "fixed";
}

export function NewChitPage() {
  const { customers, addCustomer, addChit, error } = useStore();
  const nav = useNavigate();
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
  const [remind, setRemind] = useState(true);
  const [remindDays, setRemindDays] = useState<number[]>([3]);
  const [visible, setVisible] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const n = Number(count) || 0;
  const potN = Number(pot) || 0;
  const months = Number(duration) || n;
  const instalment = computeInstalment(potN, n);
  const commPct = commKind === "percent" ? Number(comm) || 0 : potN ? Math.round(((Number(comm) || 0) / potN) * 100) : 0;
  const commMonth = commKind === "amount" ? Number(comm) || 0 : Math.round((potN * (Number(comm) || 0)) / 100);
  const interestN = Number(interest) || 0;
  const tenureN = Number(tenure) || 0;
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
        ["Type", "How winners are decided"],
        ["Style", type === "auction" ? "When the auction runs" : "How the pot is awarded"],
        ["Terms", "Amount & duration"],
        ["Members", "Who is in the group"],
      ]
    : [
        ["Type", "How winners are decided"],
        ["Terms", "Amount & duration"],
        ["Members", "Who is in the group"],
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
        remindDays: remind ? remindDays : [],
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
    <AppShell crumb="Chits" crumb2="New chit">
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
            <div className="row-head"><h2>Type</h2><span className="muted">Step 1 of {stepper.length}</span></div>
            <p className="muted block">How winners are decided each cycle.</p>
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
            <div className="row-head"><h2>Auction style</h2><span className="muted">Step 2 of {stepper.length}</span></div>
            <p className="muted block">When the auction runs relative to collections.</p>
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
            <div className="row-head"><h2>Fixed style</h2><span className="muted">Step 2 of {stepper.length}</span></div>
            <p className="muted block">How the pot is awarded each month.</p>
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
                <div className="row-head"><h2>Terms</h2><span className="muted">Step {termsStepLabel} of {stepper.length}</span></div>
                <div className="grid-2">
                  <div>
                    <label className="label">Total amount</label>
                    <input className="field" placeholder="e.g. 100000" value={pot} onChange={(e) => setPot(e.target.value)} />
                    <div className="quick">
                      {[100000, 200000, 500000].map((v) => (
                        <button key={v} className={`chip ${pot === String(v) ? "on" : ""}`} onClick={() => setPot(String(v))}>{inr(v)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Number of members</label>
                    <input className="field" placeholder="e.g. 10" value={count} onChange={(e) => { setCount(e.target.value); if (!duration) setDuration(e.target.value); }} />
                  </div>
                  <div>
                    <label className="label">Duration (in Months)</label>
                    <input className="field" placeholder="e.g. 10" value={duration} onChange={(e) => setDuration(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Start date</label>
                    <input className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                </div>
                <label className="label">Title (optional)</label>
                <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
                <label className="label">Frequency</label>
                <div className="seg block">
                  {FREQS.map((f) => (
                    <button key={f} className={`chip ${freq === f ? "on" : ""}`} onClick={() => setFreq(f)}>{FREQ_LABEL[f]}</button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <h2>Money</h2>
                <label className="label">Commission</label>
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

              <div className="card" style={{ marginTop: 16 }}>
                <h2>Settings</h2>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                  <span><strong>Payment reminders</strong><br /><span className="muted">Send automatic reminders before the due date.</span></span>
                </label>
                {remind && (
                  <div className="seg">
                    {[1, 2, 3, 5, 7].map((d) => (
                      <button
                        key={d}
                        className={`chip ${remindDays.includes(d) ? "on" : ""}`}
                        onClick={() => setRemindDays((xs) => xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d])}
                      >
                        {d} day{d > 1 ? "s" : ""} before
                      </button>
                    ))}
                  </div>
                )}
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
            <div className="card live-preview-card" style={{ alignSelf: "start" }}>
              <div className="row-head"><h2>Live preview</h2></div>
              {preview.style && <div className="kv"><span>Style</span><strong>{preview.style}</strong></div>}
              <div className="kv"><span>Members</span><strong>{preview.members}</strong></div>
              <div className="kv"><span>Duration</span><strong>{preview.duration}</strong></div>
              <div className="kv"><span>Per month</span><strong>{preview.per}</strong></div>
              <div className="kv"><span>Commission / month</span><strong>{preview.commission}</strong></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <div className="row-head"><h2>Members</h2><span className="muted">Step {membersStepLabel} of {stepper.length}</span></div>
            <p className="muted block">
              {showPayoutOrder
                ? fixedStyle === "hand_sacrifice"
                  ? "Order is the usual take sequence — early slots sacrifice one full hand (cash dividends to those still playing). Last slot takes the full pot. Use the arrows to rearrange. The same person can hold more than one hand."
                  : "Order matters — slot 1 is first to receive the pot, then slot 2, and so on. Use the arrows to rearrange. Add another hand for someone who plays twice."
                : fixedStyle === "lucky_draw" && type === "fixed"
                  ? "Members who have not won yet stay in the draw each month. One person can play multiple hands."
                  : "Add people before you start. The same person can take more than one hand — each hand fills one slot and pays its own instalment."}
            </p>
            {customers.map((c) => {
              const hands = picked.filter((id) => id === c.id).length;
              return (
                <div key={c.id} className="list-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <div className="grow">
                    <strong>{c.name}</strong> <span className="muted">{c.phone}</span>
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
                  return (
                    <div key={`${id}-${i}`} className="list-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <span className="muted">Slot {i + 1}</span>
                      <div className="grow">
                        <strong>{c?.name}</strong>
                        {totalHands > 1 ? <span className="muted"> · hand {handNo}</span> : null}
                      </div>
                      <button type="button" className="btn ghost btn-sm" disabled={i === 0} onClick={() => movePick(i, -1)}>↑</button>
                      <button type="button" className="btn ghost btn-sm" disabled={i === picked.length - 1} onClick={() => movePick(i, 1)}>↓</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid-2">
              <input className="field" placeholder="New member name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="field" placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <button className="btn ghost" type="button" onClick={async () => {
              if (!newName.trim()) return;
              const c = await addCustomer(newName.trim(), newPhone.trim());
              setPicked((p) => [...p, c.id]);
              setNewName("");
              setNewPhone("");
            }}>Add customer</button>
            <p className="muted" style={{ margin: "12px 0 16px" }}>
              {picked.length} of {n || 0} slots filled.
              {n > 0 && picked.length < n ? " Add a hand for each remaining slot before creating." : ""}
              {n > 0 && picked.length === n ? " All slots filled — ready to create." : ""}
            </p>
            <div className="wizard-actions">
              <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
              <button
                className="btn"
                disabled={saving || !n || picked.length !== n}
                onClick={() => void create()}
              >
                {saving ? "Creating…" : "Create bhishi"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
