import { AlertCircle, Layers, PiggyBank, Wallet } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { displayCycle, memberBalance, paidInCycle, rawCycleDue } from "../lib/chitMath";
import { MODE_LABEL, TYPE_LABEL, chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard } from "../ui/StatCard";

export function CustomerDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { customers, chits } = useStore();
  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <AppShell crumb="customers" crumb2="Not found">
        <div className="page">
          <p>Customer not found.</p>
          <button className="btn ghost" onClick={() => nav("/customers")}>Back to customers</button>
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
    <AppShell crumb="customers" crumb2={customer.name}>
      <div className="page">
        <div className="row-head top">
          <div className="person" style={{ gap: 14 }}>
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{initials(customer.name)}</div>
            <div>
              <h1>{customer.name}</h1>
              <p className="page-sub">{customer.phone || "No phone"} · {memberships.length} chit{memberships.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <button className="btn ghost" onClick={() => nav("/customers")}>All customers</button>
        </div>

        <div className="stats four">
          <StatCard label="Contributed" value={inr(contributed)} hint="lifetime" tone="teal" icon={PiggyBank} />
          <StatCard label="Received" value={inr(received)} hint="payouts & loans" tone="blue" icon={Wallet} />
          <StatCard
            label="Outstanding"
            value={<span className={outstanding ? "neg" : undefined}>{inr(outstanding)}</span>}
            hint="still due"
            tone="rose"
            icon={AlertCircle}
          />
          <StatCard label="Active chits" value={memberships.filter((m) => m.ch.status === "running").length} hint="running now" tone="green" icon={Layers} />
        </div>

        <div className="grid-2 block">
          <div className="card">
            <h2>Details</h2>
            <div className="kv"><span>Name</span><strong>{customer.name}</strong></div>
            <div className="kv"><span>Phone</span><strong>{customer.phone || "—"}</strong></div>
            <div className="kv"><span>Customer id</span><strong className="muted" style={{ fontSize: 12 }}>{customer.id}</strong></div>
          </div>
          <div className="card">
            <h2>Chits</h2>
            {!memberships.length && <p className="muted">Not mapped into any chit yet.</p>}
            {memberships.map(({ ch, bal, member, payouts }) => (
              <div key={ch.id} className="kv">
                <span>
                  <Link className="link" to={chitPath(ch)}>{ch.name}</Link>
                  <div className="muted">{TYPE_LABEL[ch.type]} · slot {member.slot}{member.prizedCycle ? ` · prized month ${member.prizedCycle}` : ""}</div>
                </span>
                <strong style={{ textAlign: "right" }}>
                  Paid {inr(bal.paid)}
                  <div className="muted">{payouts ? `Got ${inr(payouts)}` : bal.outstanding ? `${inr(bal.outstanding)} due` : "Settled"}</div>
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card flush block">
          <div className="card-pad"><h2>Customer ledger</h2>
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
                    <td>{row.mode ? MODE_LABEL[row.mode] || row.mode : "—"}</td>
                    <td>{row.credit ? inr(row.credit) : "—"}</td>
                    <td>{row.debit ? inr(row.debit) : "—"}</td>
                  </tr>
                ))}
                {!ledger.length && (
                  <tr><td colSpan={6}><p className="empty">No receipts or payouts yet for this customer.</p></td></tr>
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
                        <td>Cycle {cyc}{member.prizedCycle === cyc ? " · prized" : ""}</td>
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
