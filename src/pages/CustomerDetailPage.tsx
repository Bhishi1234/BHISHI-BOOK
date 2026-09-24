import { useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  PiggyBank,
  Trophy,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { displayCycle, memberBalance, paidInCycle, rawCycleDue, customerOutstanding, cycleStartDate } from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard } from "../ui/StatCard";

/** Full People profile — every bhishi this member is in. */
export function CustomerDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { customers, chits, updateCustomer, error } = useStore();
  const { m, tx, typeLabel, modeLabel, statusLabel, locale } = useI18n();
  const customer = customers.find((c) => c.id === id);
  const [editPhone, setEditPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  if (!customer) {
    return (
      <AppShell crumb={m.nav.customers} crumb2="Not found">
        <div className="page">
          <div className="page-back-row">
            <button type="button" className="page-back-btn" onClick={() => nav(-1)}>
              <ChevronLeft size={18} strokeWidth={2.4} /> {m.common.back}
            </button>
          </div>
          <p>{m.chit.customerNotFound}</p>
          <button className="btn ghost" onClick={() => nav("/customers")}>{m.common.cancel}</button>
        </div>
      </AppShell>
    );
  }

  const memberships = chits
    .filter((ch) => ch.members.some((mem) => mem.customerId === customer.id) && ch.status !== "cancelled")
    .map((ch) => {
      const hands = ch.members.filter((mem) => mem.customerId === customer.id);
      const bal = {
        paid: hands.reduce((s, h) => s + memberBalance(ch, customer.id, h.slot).paid, 0),
        outstanding: hands.reduce((s, h) => s + memberBalance(ch, customer.id, h.slot).outstanding, 0),
        due: hands.reduce((s, h) => s + memberBalance(ch, customer.id, h.slot).due, 0),
      };
      const member = hands[0]!;
      const awards = ch.auctions.filter((a) => a.winnerId === customer.id && a.method !== "settlement");
      const payouts = awards.reduce((s, a) => s + a.payout, 0);
      const receipts = ch.payments
        .filter((p) => p.memberId === customer.id)
        .slice()
        .sort((a, b) => a.cycle - b.cycle || a.date.localeCompare(b.date));
      return { ch, bal, member, hands, payouts, receipts, awards };
    });

  const contributed = memberships.reduce((s, mem) => s + mem.bal.paid, 0);
  const outstanding = customerOutstanding(chits, customer.id);
  const received = memberships.reduce((s, mem) => s + mem.payouts, 0);
  const running = memberships.filter((mem) => mem.ch.status === "running").length;

  const ledger = memberships.flatMap(({ ch, receipts }) => {
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
        label: tx(m.customerDetail.cycleContribution, { n: p.cycle }),
        credit: 0,
        debit: p.amount,
        mode: p.mode,
      });
    }
    for (const a of ch.auctions.filter((x) => x.winnerId === customer.id)) {
      const when = cycleStartDate(ch, a.cycle);
      rows.push({
        key: `a-${ch.id}-${a.cycle}`,
        when: when.toISOString().slice(0, 10),
        chitName: ch.name,
        chitId: ch.id,
        label: a.method === "auction"
          ? tx(m.customerDetail.cycleAuction, { n: a.cycle })
          : a.method === "lucky_draw"
            ? tx(m.customerDetail.cycleLucky, { n: a.cycle })
            : ch.type === "loan"
              ? tx(m.customerDetail.cycleLoan, { n: a.cycle })
              : tx(m.customerDetail.cycleAward, { n: a.cycle }),
        credit: a.payout,
        debit: 0,
      });
    }
    return rows;
  }).sort((a, b) => b.when.localeCompare(a.when));

  return (
    <AppShell crumb={m.nav.customers} crumb2={customer.name}>
      <div className="page member-page">
        <div className="page-back-row">
          <button type="button" className="page-back-btn" onClick={() => nav("/customers")}>
            <ChevronLeft size={18} strokeWidth={2.4} /> {m.common.back}
          </button>
        </div>

        <div className="card member-hero-card">
          <div className="member-hero">
            <div className="avatar tone-teal" style={{ width: 56, height: 56, fontSize: 18 }}>
              {initials(customer.name)}
            </div>
            <div className="grow">
              <h1 style={{ margin: 0 }}>{customer.name}</h1>
              <p className="page-sub" style={{ margin: "4px 0 0" }}>
                {customer.phone || m.customersPage.noPhone}
                {" · "}
                {tx(m.customerDetail.groupsCount, { n: memberships.length })}
              </p>
            </div>
          </div>
          {editPhone ? (
            <div className="phone-edit-row" style={{ marginTop: 12 }}>
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
            <div className="member-hero-actions">
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() => {
                  setPhoneVal(customer.phone || "");
                  setEditPhone(true);
                }}
              >
                {m.chit.editPhone}
              </button>
              {customer.phone ? (
                <MemberReachButtons
                  phone={customer.phone}
                  whatsappText={`Hi ${customer.name}`}
                  compact
                />
              ) : null}
            </div>
          )}
          {error && editPhone && <p className="due" style={{ marginTop: 6 }}>{error}</p>}
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
          <StatCard label={m.chit.activeChits} value={running} hint={m.chit.runningNow} tone="green" icon={Layers} />
        </div>

        <div className="block">
          <div className="row-head" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{m.customerDetail.bhishiCards}</h2>
            <span className="muted">{memberships.length}</span>
          </div>
          {!memberships.length && (
            <div className="card"><p className="muted" style={{ margin: 0 }}>{m.chit.notMapped}</p></div>
          )}
          <div className="member-chit-grid">
            {memberships.map(({ ch, bal, member, hands, payouts, awards }) => (
              <div key={ch.id} className="card member-chit-card">
                <div className="member-chit-card-top">
                  <div>
                    <Link className="link" to={chitPath(ch)} style={{ fontWeight: 650, fontSize: 15 }}>
                      {ch.name}
                    </Link>
                    <div className="muted" style={{ marginTop: 2 }}>
                      {typeLabel(ch.type)} · {statusLabel(ch.status)} · {hands.length > 1 ? `${hands.length} ${m.terms.hands}` : `${m.terms.hand} ${member.slot}`}
                      {member.prizedCycle ? ` · ${tx(m.customerDetail.cyclePrized, { n: member.prizedCycle })}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost btn-sm"
                    onClick={() => nav(`/chits/${ch.id}/members/${customer.id}`)}
                  >
                    {m.customerDetail.thisBhishi}
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
                <div className="member-mini-stats">
                  <div>
                    <span className="muted">{m.customerDetail.contributed}</span>
                    <strong>{inr(bal.paid)}</strong>
                  </div>
                  <div>
                    <span className="muted">{m.customerDetail.received}</span>
                    <strong>{inr(payouts)}</strong>
                  </div>
                  <div>
                    <span className="muted">{m.terms.outstanding}</span>
                    <strong className={bal.outstanding ? "neg" : undefined}>{inr(bal.outstanding)}</strong>
                  </div>
                </div>
                {!!awards.length && (
                  <div className="member-win-strip">
                    <Trophy size={13} strokeWidth={2.2} />
                    {awards.map((a) => (
                      <span key={a.cycle}>
                        {tx(m.customerDetail.haptaN, { n: a.cycle })} · {inr(a.payout)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card flush block">
          <div className="card-pad">
            <h2>{m.customerDetail.ledger}</h2>
            <p className="muted">{m.customerDetail.ledgerAllHint}</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{m.common.date}</th>
                  <th>{m.nav.chits}</th>
                  <th>{m.customerDetail.entry}</th>
                  <th>{m.payModal.mode}</th>
                  <th>{m.customerDetail.inCol}</th>
                  <th>{m.customerDetail.outCol}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.key}>
                    <td>{new Date(row.when).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</td>
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
              <div className="row-head" style={{ margin: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{m.customerDetail.passbook} · {ch.name}</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{m.customerDetail.passbookHint}</p>
                </div>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  onClick={() => nav(`/chits/${ch.id}/members/${customer.id}`)}
                >
                  {m.customerDetail.openInBhishi}
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{m.chit.cycle}</th>
                    <th>{m.customerDetail.due}</th>
                    <th>{m.customerDetail.paidCol}</th>
                    <th>{m.customerDetail.balanceCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: displayCycle(ch) }, (_, i) => i + 1).map((cyc) => {
                    const due = rawCycleDue(ch, customer.id, cyc);
                    const paid = paidInCycle(ch, customer.id, cyc);
                    const left = Math.max(0, due - paid);
                    return (
                      <tr key={cyc}>
                        <td>{member.prizedCycle === cyc ? tx(m.customerDetail.cyclePrized, { n: cyc }) : `${m.terms.haptaRound} ${cyc}`}</td>
                        <td>{inr(due)}</td>
                        <td>{inr(paid)}</td>
                        <td className={left ? "neg" : ""}>{left ? inr(left) : "—"}</td>
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
