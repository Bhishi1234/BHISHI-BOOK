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
    body: "Early winners take the pot minus half an instalment; that cut is paid as cash dividends to members still playing. The last member takes the full pot. Lucky draw available if no one steps up.",
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

  return (
    <AppShell crumb="Chits" crumb2="New chit">
      <div className="page">
        <div className="row-head">
          <div>
            <h1>New chit</h1>
            <p className="page-sub">Set the terms once — every cycle, dividend and payout is derived from them.</p>
          </div>
          <button className="btn ghost" onClick={() => nav("/chits")}>Cancel</button>
        </div>

        <div className="stepper">
          {stepper.map(([t, s], i) => (
            <div key={t} className={`step ${i <= displayStep ? "on" : ""}`}>
              <b>{i < displayStep ? "✓" : i + 1}</b>
              <div><div>{t}</div><small>{s}</small></div>
            </div>
          ))}
        </div>
        {error && <p className="due">{error}</p>}

        {step === 0 && (
          <div className="card">
            <div className="row-head"><h2>Type</h2><span className="muted">Step 1</span></div>
            <div className="type-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {TYPES.map((t) => (
                <button key={t.id} className={`type-pick ${type === t.id ? "active" : ""}`} onClick={() => setType(t.id)}>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </button>
              ))}
            </div>
            <div className="row-head" style={{ marginBottom: 0, marginTop: 20 }}>
              <span />
              <button className="btn" onClick={goFromType}>
                {needsStyleStep(type) ? `Continue to ${type === "auction" ? "auction" : "fixed"} style →` : "Continue to terms →"}
              </button>
            </div>
          </div>
        )}

        {step === 1 && type === "auction" && (
          <div className="card">
            <div className="row-head"><h2>Auction style</h2><span className="muted">Step 2</span></div>
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
            <div className="row-head" style={{ marginBottom: 0, marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn" onClick={() => setStep(2)}>Continue to terms →</button>
            </div>
          </div>
        )}

        {step === 1 && type === "fixed" && (
          <div className="card">
            <div className="row-head"><h2>Fixed style</h2><span className="muted">Step 2</span></div>
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
            <div className="row-head" style={{ marginBottom: 0, marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn" onClick={() => setStep(2)}>Continue to terms →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid-2">
            <div>
              <div className="card">
                <div className="row-head"><h2>Terms</h2><span className="muted">Step {termsStepLabel}</span></div>
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
                    <label className="label">Repayment tenure (months)</label>
                    <input className="field" placeholder="Blank = rest of the chit" value={tenure} onChange={(e) => setTenure(e.target.value)} />
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
                <div className="toolbar">
                  <button className="btn ghost" onClick={() => setStep(needsStyleStep(type) ? 1 : 0)}>Back</button>
                  <button
                    className="btn"
                    disabled={!confirm || !potN || !n || (type === "loan" && !interestN)}
                    onClick={() => setStep(3)}
                  >
                    Continue to members
                  </button>
                </div>
              </div>
            </div>
            <div className="card" style={{ alignSelf: "start" }}>
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
            <div className="row-head"><h2>Members</h2><span className="muted">Step {membersStepLabel}</span></div>
            <p className="muted block">
              {showPayoutOrder
                ? fixedStyle === "hand_sacrifice"
                  ? "Order is the usual take sequence — early slots sacrifice half a hand (cash dividends to those still playing). Last slot takes the full pot. Use the arrows to rearrange."
                  : "Order matters — slot 1 is first to receive the pot, then slot 2, and so on. Use the arrows to rearrange."
                : fixedStyle === "lucky_draw" && type === "fixed"
                  ? "Members who have not won yet stay in the draw each month. Order does not decide who wins."
                  : "Added before you start. You can leave slots empty and map people later."}
            </p>
            {customers.map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={picked.includes(c.id)}
                  onChange={(e) => setPicked((p) => e.target.checked ? [...p, c.id] : p.filter((id) => id !== c.id))}
                />
                {c.name} <span className="muted">{c.phone}</span>
              </label>
            ))}
            {showPayoutOrder && !!picked.length && (
              <div className="card" style={{ margin: "12px 0", background: "#f8fafc" }}>
                <strong>Payout order</strong>
                {picked.map((id, i) => {
                  const c = customers.find((x) => x.id === id);
                  return (
                    <div key={id} className="list-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <span className="muted">Slot {i + 1}</span>
                      <div className="grow"><strong>{c?.name}</strong></div>
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
            <p className="muted" style={{ margin: "12px 0 16px" }}>{picked.length} of {n || 0} slots filled.</p>
            <div className="toolbar">
              <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
              <button className="btn" disabled={saving} onClick={() => void create()}>{saving ? "Creating…" : "Create chit"}</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
