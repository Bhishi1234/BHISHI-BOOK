import { useState } from "react";
import { AlertCircle, Layers, PiggyBank, Wallet } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { displayCycle, memberBalance, paidInCycle, rawCycleDue } from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard } from "../ui/StatCard";

export function CustomerDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { customers, chits, updateCustomer, error } = useStore();
  const { m, tx, typeLabel, modeLabel } = useI18n();
  const customer = customers.find((c) => c.id === id);
  const [editPhone, setEditPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  if (!customer) {
    return (
      <AppShell crumb={m.nav.customers} crumb2="Not found">
        <div className="page">
          <p>{m.chit.customerNotFound}</p>
          <button className="btn ghost" onClick={() => nav("/customers")}>{m.common.cancel}</button>
        </div>
      </AppShell>
    );
  }

  const memberships = chits
    .filter((ch) => ch.members.some((m) => m.customerId === customer.id) && ch.status !== "cancelled")
    .map((ch) => {
      const bal = memberBalance(ch, customer.id);
      const member = ch.members.find((m) => m.customerId === customer.id)!;
      const payouts = ch.auctions
        .filter((a) => a.winnerId === customer.id)
        .reduce((s, a) => s + a.payout, 0);
      const receipts = ch.payments
        .filter((p) => p.memberId === customer.id)
        .slice()
        .sort((a, b) => a.cycle - b.cycle || a.date.localeCompare(b.date));
      return { ch, bal, member, payouts, receipts };
    });

  const contributed = memberships.reduce((s, m) => s + m.bal.paid, 0);
  const outstanding = memberships.reduce((s, m) => s + m.bal.outstanding, 0);
  const received = memberships.reduce((s, m) => s + m.payouts, 0);

  const ledger = memberships.flatMap(({ ch, receipts, member }) => {
    const rows: {
      key: string;
      when: string;
      chitName: string;
      chitId: string;
      label: string;
      credit: number;
      debit: number;
      mode?: string;
    }[] = [];
    for (const p of receipts) {
      rows.push({
        key: `p-${p.id}`,
        when: p.date,
        chitName: ch.name,
        chitId: ch.id,
        label: `Cycle ${p.cycle} · contribution`,
        credit: 0,
        debit: p.amount,
        mode: p.mode,
      });
    }
    for (const a of ch.auctions.filter((x) => x.winnerId === customer.id)) {
      const when = new Date(ch.startDate);
      when.setMonth(when.getMonth() + a.cycle - 1);
      rows.push({
        key: `a-${ch.id}-${a.cycle}`,
        when: when.toISOString().slice(0, 10),
        chitName: ch.name,
        chitId: ch.id,
        label: a.method === "auction"
          ? `Cycle ${a.cycle} · auction payout`
          : a.method === "lucky_draw"
            ? `Cycle ${a.cycle} · lucky draw`
            : ch.type === "loan"
              ? `Cycle ${a.cycle} · loan received`
              : `Cycle ${a.cycle} · pot awarded`,
        credit: a.payout,
        debit: 0,
      });
    }
    if (member.prizedCycle) {
      /* prized marker already covered by auction row */
    }
    return rows;
  }).sort((a, b) => b.when.localeCompare(a.when));

  return (
    <AppShell crumb={m.nav.customers} crumb2={customer.name}>
      <div className="page">
        <div className="row-head top">
          <div className="person" style={{ gap: 14 }}>
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{initials(customer.name)}</div>
            <div>
              <h1>{customer.name}</h1>
              <p className="page-sub">{customer.phone || m.customersPage.noPhone} · {memberships.length} {memberships.length === 1 ? m.common.member : m.common.members}</p>
              {editPhone ? (
                <div className="phone-edit-row" style={{ marginTop: 8 }}>
                  <input
                    className="field"
                    inputMode="tel"
                    value={phoneVal}
                    onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={savingPhone || phoneVal.length !== 10}
                    onClick={() => {
                      setSavingPhone(true);
                      void updateCustomer(customer.id, { phone: phoneVal })
                        .then(() => setEditPhone(false))
                        .finally(() => setSavingPhone(false));
                    }}
                  >
                    {m.chit.savePhone}
                  </button>
                  <button type="button" className="btn ghost btn-sm" onClick={() => setEditPhone(false)}>
                    {m.common.cancel}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    setPhoneVal(customer.phone || "");
                    setEditPhone(true);
                  }}
                >
                  {m.chit.editPhone}
                </button>
              )}
              {error && editPhone && <p className="due" style={{ marginTop: 6 }}>{error}</p>}
            </div>
          </div>
          <button className="btn ghost" onClick={() => nav("/customers")}>{m.customerDetail.allCustomers}</button>
        </div>

        <div className="stats four">
          <StatCard label={m.customerDetail.contributed} value={inr(contributed)} hint={m.customersPage.lifetime} tone="teal" icon={PiggyBank} />
          <StatCard label={m.customerDetail.received} value={inr(received)} hint={m.chit.payoutsAndLoans} tone="blue" icon={Wallet} />
          <StatCard
            label={m.terms.outstanding}
            value={<span className={outstanding ? "neg" : undefined}>{inr(outstanding)}</span>}
            hint={m.customersPage.stillDue}
            tone="rose"
            icon={AlertCircle}
          />
          <StatCard label={m.chit.activeChits} value={memberships.filter((mem) => mem.ch.status === "running").length} hint={m.chit.runningNow} tone="green" icon={Layers} />
        </div>

        <div className="grid-2 block">
          <div className="card">
            <h2>{m.chit.details}</h2>
            <div className="kv"><span>Name</span><strong>{customer.name}</strong></div>
            <div className="kv"><span>Phone</span><strong>{customer.phone || "—"}</strong></div>
            <div className="kv"><span>Customer id</span><strong className="muted" style={{ fontSize: 12 }}>{customer.id}</strong></div>
          </div>
          <div className="card">
            <h2>Chits</h2>
            {!memberships.length && <p className="muted">{m.chit.notMapped}</p>}
            {memberships.map(({ ch, bal, member, payouts }) => (
              <div key={ch.id} className="kv">
                <span>
                  <Link className="link" to={chitPath(ch)}>{ch.name}</Link>
                  <div className="muted">{typeLabel(ch.type)} · {m.terms.hand} {member.slot}{member.prizedCycle ? ` · ${m.terms.prized} ${member.prizedCycle}` : ""}</div>
                </span>
                <strong style={{ textAlign: "right" }}>
                  Paid {inr(bal.paid)}
                  <div className="muted">{payouts ? tx(m.customerDetail.gotAmount, { amount: inr(payouts) }) : bal.outstanding ? `${inr(bal.outstanding)} due` : m.customerDetail.settled}</div>
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card flush block">
          <div className="card-pad"><h2>{m.customerDetail.ledger}</h2>
            <p className="muted">Every contribution and every amount this person received across your books.</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Chit</th>
                  <th>Entry</th>
                  <th>Mode</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.key}>
                    <td>{new Date(row.when).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td><Link className="link" to={`/chits/${row.chitId}`}>{row.chitName}</Link></td>
                    <td>{row.label}</td>
                    <td>{row.mode ? modeLabel(row.mode) || row.mode : "—"}</td>
                    <td>{row.credit ? inr(row.credit) : "—"}</td>
                    <td>{row.debit ? inr(row.debit) : "—"}</td>
                  </tr>
                ))}
                {!ledger.length && (
                  <tr><td colSpan={6}><p className="empty">{m.chit.ledgerEmpty}</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {memberships.map(({ ch, member }) => (
          <div key={`pass-${ch.id}`} className="card flush block">
            <div className="card-pad">
              <h2>Passbook · {ch.name}</h2>
              <p className="muted">Cycle-by-cycle due vs paid for this member.</p>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Cycle</th><th>Due</th><th>Paid</th><th>Balance</th></tr></thead>
                <tbody>
                  {Array.from({ length: displayCycle(ch) }, (_, i) => i + 1).map((cyc) => {
                    const due = rawCycleDue(ch, customer.id, cyc);
                    const paid = paidInCycle(ch, customer.id, cyc);
                    return (
                      <tr key={cyc}>
                        <td>{member.prizedCycle === cyc ? tx(m.customerDetail.cyclePrized, { n: cyc }) : `${m.terms.haptaRound} ${cyc}`}</td>
                        <td>{inr(due)}</td>
                        <td>{inr(paid)}</td>
                        <td>{paid >= due ? "—" : inr(due - paid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
