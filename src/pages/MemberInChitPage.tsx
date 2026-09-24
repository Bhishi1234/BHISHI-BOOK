import { useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Gift,
  HandCoins,
  PiggyBank,
  Trophy,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import {
  displayCycle,
  memberBalance,
  paidInCycle,
  rawCycleDue,
} from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard } from "../ui/StatCard";

/** Member view scoped to one bhishi — opened from Members / Hapta Collect. */
export function MemberInChitPage() {
  const { id: chitId, customerId } = useParams();
  const nav = useNavigate();
  const { customers, chits, updateCustomer, error } = useStore();
  const { m, tx, typeLabel, modeLabel, statusLabel, locale } = useI18n();
  const [editPhone, setEditPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const chit = chits.find((c) => c.id === chitId);
  const member = chit?.members.find((x) => x.customerId === customerId);

  if (!customer || !chit || !member) {
    return (
      <AppShell crumb={m.nav.customers} crumb2={m.chit.customerNotFound}>
        <div className="page">
          <div className="page-back-row">
            <button type="button" className="page-back-btn" onClick={() => nav(-1)}>
              <ChevronLeft size={18} strokeWidth={2.4} /> {m.common.back}
            </button>
          </div>
          <p>{m.chit.customerNotFound}</p>
        </div>
      </AppShell>
    );
  }

  const hands = chit.members.filter((x) => x.customerId === customer.id);
  const bal = memberBalance(chit, customer.id, member.slot);
  const awards = chit.auctions
    .filter((a) => a.winnerId === customer.id && a.method !== "settlement")
    .slice()
    .sort((a, b) => a.cycle - b.cycle);
  const payouts = awards.reduce((s, a) => s + a.payout, 0);
  const receipts = chit.payments
    .filter((p) => p.memberId === customer.id)
    .slice()
    .sort((a, b) => a.cycle - b.cycle || a.date.localeCompare(b.date));

  const ledger = [
    ...receipts.map((p) => ({
      key: `p-${p.id}`,
      when: p.date,
      label: tx(m.customerDetail.cycleContribution, { n: p.cycle }),
      credit: 0,
      debit: p.amount,
      mode: p.mode,
    })),
    ...awards.map((a) => {
      const when = new Date(chit.startDate);
      when.setMonth(when.getMonth() + a.cycle - 1);
      const label =
        a.method === "auction"
          ? tx(m.customerDetail.cycleAuction, { n: a.cycle })
          : a.method === "lucky_draw"
            ? tx(m.customerDetail.cycleLucky, { n: a.cycle })
            : chit.type === "loan"
              ? tx(m.customerDetail.cycleLoan, { n: a.cycle })
              : tx(m.customerDetail.cycleAward, { n: a.cycle });
      return {
        key: `a-${chit.id}-${a.cycle}-${a.winnerSlot ?? 0}`,
        when: when.toISOString().slice(0, 10),
        label,
        credit: a.payout,
        debit: 0,
        mode: undefined as string | undefined,
      };
    }),
  ].sort((a, b) => b.when.localeCompare(a.when));

  const through = displayCycle(chit);
  const cyclesPaid = Array.from({ length: through }, (_, i) => i + 1).filter(
    (cyc) => paidInCycle(chit, customer.id, cyc) >= rawCycleDue(chit, customer.id, cyc) && rawCycleDue(chit, customer.id, cyc) > 0,
  ).length;

  return (
    <AppShell crumb={chit.name} crumb2={customer.name}>
      <div className="page member-page">
        <div className="page-back-row">
          <button type="button" className="page-back-btn" onClick={() => nav(chitPath(chit))}>
            <ChevronLeft size={18} strokeWidth={2.4} /> {m.common.back}
          </button>
        </div>

        <div className="card member-hero-card">
          <div className="member-hero">
            <div className="avatar tone-blue" style={{ width: 56, height: 56, fontSize: 18 }}>
              {initials(customer.name)}
            </div>
            <div className="grow">
              <h1 style={{ margin: 0 }}>{customer.name}</h1>
              <p className="page-sub" style={{ margin: "4px 0 0" }}>
                {customer.phone || m.customersPage.noPhone}
                {" · "}
                {tx(m.customerDetail.handInChit, { n: member.slot })}
                {member.prizedCycle ? ` · ${tx(m.customerDetail.cyclePrized, { n: member.prizedCycle })}` : ""}
              </p>
              <Link className="member-chit-chip" to={chitPath(chit)}>
                {chit.name}
                <span className="muted"> · {typeLabel(chit.type)} · {statusLabel(chit.status)}</span>
              </Link>
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
          <button
            type="button"
            className="btn member-all-details-btn"
            onClick={() => nav(`/customers/${customer.id}`)}
          >
            {m.customerDetail.viewAllDetails}
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="stats four">
          <StatCard label={m.customerDetail.contributed} value={inr(bal.paid)} hint={m.customerDetail.inThisBhishi} tone="teal" icon={PiggyBank} />
          <StatCard label={m.customerDetail.received} value={inr(payouts)} hint={m.customerDetail.winsAndLoans} tone="blue" icon={Wallet} />
          <StatCard
            label={m.terms.outstanding}
            value={<span className={bal.outstanding ? "neg" : undefined}>{inr(bal.outstanding)}</span>}
            hint={m.customersPage.stillDue}
            tone="rose"
            icon={AlertCircle}
          />
          <StatCard
            label={m.customerDetail.haptaPaid}
            value={`${cyclesPaid}/${through}`}
            hint={m.customerDetail.cyclesCleared}
            tone="green"
            icon={HandCoins}
          />
        </div>

        <div className="grid-2 block">
          <div className="card member-insight-card">
            <div className="member-card-head">
              <Trophy size={16} strokeWidth={2.2} />
              <h2>{m.customerDetail.winsCard}</h2>
            </div>
            {!awards.length && <p className="muted" style={{ margin: 0 }}>{m.customerDetail.noWinsYet}</p>}
            {awards.map((a) => (
              <div key={`${a.cycle}-${a.winnerSlot ?? 0}`} className="kv">
                <span>
                  {tx(m.customerDetail.haptaN, { n: a.cycle })}
                  <div className="muted">
                    {a.method === "auction"
                      ? m.type.auction
                      : a.method === "lucky_draw"
                        ? m.type.lucky_draw
                        : chit.type === "loan"
                          ? m.type.loan
                          : m.chit.award}
                    {a.bid ? ` · bid ${inr(a.bid)}` : ""}
                  </div>
                </span>
                <strong className="num">{inr(a.payout)}</strong>
              </div>
            ))}
          </div>
          <div className="card member-insight-card">
            <div className="member-card-head">
              <Gift size={16} strokeWidth={2.2} />
              <h2>{m.customerDetail.snapshotCard}</h2>
            </div>
            <div className="kv"><span>{m.terms.hand}</span><strong>{member.slot}{hands.length > 1 ? ` / ${hands.length}` : ""}</strong></div>
            <div className="kv"><span>{m.detail.type}</span><strong>{typeLabel(chit.type)}</strong></div>
            <div className="kv"><span>{m.chit.contribution}</span><strong>{inr(chit.instalment)}</strong></div>
            <div className="kv"><span>{m.customerDetail.statusLabel}</span><strong>{statusLabel(chit.status)}</strong></div>
            <div className="kv">
              <span>{m.customerDetail.netPosition}</span>
              <strong className={payouts - bal.paid < 0 ? "neg" : ""}>{inr(payouts - bal.paid)}</strong>
            </div>
          </div>
        </div>

        <div className="card flush block">
          <div className="card-pad">
            <h2>{m.customerDetail.passbook}</h2>
            <p className="muted">{m.customerDetail.passbookHint}</p>
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
                {Array.from({ length: through }, (_, i) => i + 1).map((cyc) => {
                  const due = rawCycleDue(chit, customer.id, cyc);
                  const paid = paidInCycle(chit, customer.id, cyc);
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

        <div className="card flush block">
          <div className="card-pad">
            <h2>{m.customerDetail.ledger}</h2>
            <p className="muted">{m.customerDetail.ledgerThisBhishi}</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{m.common.date}</th>
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
                    <td>{row.label}</td>
                    <td>{row.mode ? modeLabel(row.mode) || row.mode : "—"}</td>
                    <td>{row.credit ? inr(row.credit) : "—"}</td>
                    <td>{row.debit ? inr(row.debit) : "—"}</td>
                  </tr>
                ))}
                {!ledger.length && (
                  <tr><td colSpan={5}><p className="empty">{m.chit.ledgerEmpty}</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
