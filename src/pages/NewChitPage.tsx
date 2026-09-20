import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import type { ChitType, Frequency } from "../types";
import { FREQ_LABEL, inr } from "../lib/format";
import { useStore } from "../store";

const TYPES: { id: ChitType; title: string; body: string }[] = [
  { id: "auction", title: "Auction", body: "Members bid each cycle; winner takes the pot." },
  { id: "fixed", title: "Fixed", body: "Predetermined payout order. Optional premium after prized." },
  { id: "loan", title: "Loan", body: "Member takes a loan; then pays base + monthly interest." },
];

const FREQS: Frequency[] = ["daily", "weekly", "biweekly", "monthly", "quarterly", "halfyearly", "yearly"];

export function NewChitPage() {
  const { customers, addCustomer, addChit, error } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ChitType>("auction");
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
  const [premium, setPremium] = useState("");
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
  const instalment = n ? Math.round(potN / n) : 0;
  const commPct = commKind === "percent" ? Number(comm) || 0 : potN ? Math.round(((Number(comm) || 0) / potN) * 100) : 0;
  const commMonth = commKind === "amount" ? Number(comm) || 0 : Math.round((potN * (Number(comm) || 0)) / 100);

  const interestN = Number(interest) || 0;
  const tenureN = Number(tenure) || 0;
  const premiumN = Number(premium) || 0;

  const preview = useMemo(() => ({
    members: n || "—",
    duration: months ? `${months} months` : "0 months",
    per: instalment ? inr(instalment) : "—",
    commission: commMonth ? inr(commMonth) : "—",
    interest: type === "loan" && interestN ? `${interestN}%` : "—",
    premium: type === "fixed" && premiumN ? inr(premiumN) : "—",
    afterLoan: type === "loan" && instalment
      ? inr(Math.round(instalment + (instalment * interestN) / 100))
      : "—",
  }), [n, months, instalment, commMonth, type, interestN, premiumN]);

  async function create() {
    setSaving(true);
    try {
      const members = picked.map((customerId, i) => ({ customerId, slot: i + 1 }));
      const id = await addChit({
        name: title.trim() || `${TYPES.find((t) => t.id === type)?.title} - ${inr(potN)}`,
        title: title.trim() || undefined,
        type,
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
        interestRate: type === "loan" ? interestN : undefined,
        repaymentTenure: type === "loan" && tenureN > 0 ? tenureN : undefined,
        premiumAmount: type === "fixed" && premiumN > 0 ? premiumN : undefined,
        remindDays: remind ? remindDays : [],
        memberVisible: visible,
      });
      nav(`/chits/${id}`);
    } finally {
      setSaving(false);
    }
  }

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
          {[
            ["Type", "Pick how winners are decided"],
            ["Terms", "Amount & duration"],
            ["Members", "Added before you start"],
          ].map(([t, s], i) => (
            <div key={t} className={`step ${i <= step ? "on" : ""}`}>
              <b>{i < step ? "✓" : i + 1}</b>
              <div>
                <div>{t}</div>
                <small>{s}</small>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="due">{error}</p>}

        {step === 0 && (
          <div className="card">
            <div className="row-head"><h2>Type</h2><span className="muted">Step 1 of 3</span></div>
            <div className="type-row">
              {TYPES.map((t) => (
                <button key={t.id} className={`type-pick ${type === t.id ? "active" : ""}`} onClick={() => setType(t.id)}>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </button>
              ))}
            </div>
            <div className="row-head" style={{ marginBottom: 0, marginTop: 20 }}>
              <p className="muted">The type fixes how each cycle’s winner is decided — it cannot be changed later.</p>
              <button className="btn" onClick={() => setStep(1)}>Continue to terms →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid-2">
            <div>
              <div className="card">
                <div className="row-head"><h2>Terms</h2><span className="muted">Step 2 of 3</span></div>
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
                    <p className="hint">Sets the number of cycles</p>
                  </div>
                  <div>
                    <label className="label">Duration (in Months)</label>
                    <input className="field" placeholder="e.g. 10 (max 120)" value={duration} onChange={(e) => setDuration(e.target.value)} />
                    <p className="hint">Matches the member count</p>
                  </div>
                  <div>
                    <label className="label">Start date</label>
                    <input className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                    <p className="hint">First collection day</p>
                  </div>
                </div>
                <label className="label">Title (optional)</label>
                <input className="field" placeholder="e.g. Fixed - ₹100000" value={title} onChange={(e) => setTitle(e.target.value)} />
                <p className="hint">Members see this name</p>
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
                    ? "Taken from cash on hand each time you give a loan this month."
                    : type === "auction"
                      ? "Taken from the pot each month when you settle that month’s auction. 5% of ₹1,00,000 is ₹5,000 every month — it leaves cash on hand."
                      : "Taken from cash on hand when you award the pot for the month."}
                </p>
                {type === "loan" && (
                  <>
                    <label className="label">Interest rate (% per month)</label>
                    <input className="field" placeholder="e.g. 5" value={interest} onChange={(e) => setInterest(e.target.value)} />
                    <div className="quick">
                      {[1, 2, 3, 5, 10].map((v) => (
                        <button key={v} className={`chip ${interest === String(v) ? "on" : ""}`} onClick={() => setInterest(String(v))}>{v}%</button>
                      ))}
                    </div>
                    <p className="hint">After a member takes a loan, each following month they pay: deposit + interest on the loan principal + a share of the principal over the repayment tenure.</p>
                    <label className="label">Repayment tenure (months)</label>
                    <input className="field" placeholder={`e.g. ${months || 5} (blank = rest of the chit)`} value={tenure} onChange={(e) => setTenure(e.target.value)} />
                    <p className="hint">How many months after the loan the principal is recovered. Leave blank to spread over the remaining months of the chit.</p>
                  </>
                )}
                {type === "fixed" && (
                  <>
                    <label className="label">Premium after prized (optional)</label>
                    <input
                      className="field"
                      placeholder={instalment ? `e.g. ${Math.round(instalment * 1.2)}` : "e.g. 12000"}
                      value={premium}
                      onChange={(e) => setPremium(e.target.value)}
                    />
                    <p className="hint">Leave blank for a flat committee (same due every month). Set a premium if prized members pay more from the month they win.</p>
                  </>
                )}
                {type === "auction" && (
                  <>
                    <label className="label">Adjustment style</label>
                    <div className="seg">
                      <button className={`chip ${adjust === "every_month" ? "on" : ""}`} onClick={() => setAdjust("every_month")}>Every month</button>
                      <button className={`chip ${adjust === "at_end" ? "on" : ""}`} onClick={() => setAdjust("at_end")}>At the end</button>
                    </div>
                    <p className="hint">Per-cycle adjusts each member’s amount as dividends accrue; at-end settles once at completion.</p>
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
                  <>
                    <label className="label">Remind before due</label>
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
                    <p className="hint">Pick as many as you like.</p>
                  </>
                )}
                <label className="check">
                  <input className="toggle" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                  <span><strong>Allow members to view this chit</strong><br /><span className="muted">Members can see chit details in the app.</span></span>
                </label>
                <label className="check">
                  <input className="toggle" type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  I understand how this chit works and the details above are correct.
                </label>
                <p className="hint">Every term can still be edited before the first payout.</p>
                <div className="toolbar">
                  <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
                  <button className="btn" disabled={!potN || !n || !confirm || (type === "loan" && !interestN)} onClick={() => setStep(2)}>Continue to members</button>
                </div>
              </div>
            </div>
            <div className="card" style={{ alignSelf: "start" }}>
              <div className="row-head"><h2>Live preview</h2><span className="muted">Updates as you type</span></div>
              <div className="kv"><span>Members</span><strong>{preview.members}</strong></div>
              <div className="kv"><span>Duration</span><strong>{preview.duration}</strong></div>
              <div className="kv"><span>Per month / member</span><strong>{preview.per}</strong></div>
              <div className="kv"><span>Commission / month</span><strong>{preview.commission}</strong></div>
              {type === "loan" && (
                <>
                  <div className="kv"><span>Interest</span><strong>{preview.interest}</strong></div>
                  <div className="kv"><span>Due after loan (1st month)</span><strong>{preview.afterLoan}</strong></div>
                  <div className="kv"><span>Repayment tenure</span><strong>{tenureN ? `${tenureN} months` : "Rest of chit"}</strong></div>
                </>
              )}
              {type === "fixed" && Number(premium) > 0 && (
                <div className="kv"><span>Premium after prized</span><strong>{preview.premium}</strong></div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <div className="row-head"><h2>Members</h2><span className="muted">Step 3 of 3</span></div>
            <p className="muted block">Added before you start. You can leave slots empty and map people later.</p>
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
              <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn" disabled={saving} onClick={() => void create()}>{saving ? "Creating…" : "Create chit"}</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
