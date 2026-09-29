import { useState } from "react";
import { ChevronLeft, Gift, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import {
  cycleStartDate,
  displayCycle,
  memberBalance,
  paidInCycle,
  rawCycleDue,
} from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";

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
      const when = cycleStartDate(chit, a.cycle);
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
  const dueNow = rawCycleDue(chit, customer.id, through);
  const paidNow = paidInCycle(chit, customer.id, through);
  const leftNow = Math.max(0, dueNow - paidNow);

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
            <div className="avatar tone-blue" style={{ width: 48, height: 48, fontSize: 16 }}>
              {initials(customer.name)}
            </div>
            <div className="grow">
              <h1 style={{ margin: 0 }}>{customer.name}</h1>
              <p className="page-sub" style={{ margin: "2px 0 0" }}>
                {customer.phone ? `+91 ${customer.phone}` : m.customersPage.noPhone}
              </p>
            </div>
            {!editPhone && customer.phone ? (
              <MemberReachButtons
                phone={customer.phone}
                whatsappText={`Hi ${customer.name}`}
                compact
              />
            ) : null}
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
            <button
              type="button"
              className="link"
              style={{ marginTop: 8 }}
              onClick={() => {
                setPhoneVal(customer.phone || "");
                setEditPhone(true);
              }}
            >
              {m.chit.editPhone}
            </button>
          )}
          {error && editPhone && <p className="due" style={{ marginTop: 6 }}>{error}</p>}
          <p className="owe-line">
            {m.customerDetail.oweLead}{" "}
            <span className="neg">{inr(leftNow)}</span>
          </p>
          <div className="fact-grid">
            <div>
              <span>{m.customerDetail.contributed}</span>
              <strong>{inr(bal.paid)}</strong>
            </div>
            <div>
              <span>{m.customerDetail.received}</span>
              <strong>{inr(payouts)}</strong>
            </div>
            <div>
              <span>{m.terms.hands}</span>
              <strong>{member.slot} / {chit.duration}</strong>
            </div>
            <div>
              <span>{m.customerDetail.winsCard}</span>
              <strong>{awards[0] ? awards[0].cycle : "—"}</strong>
            </div>
          </div>
          <button
            type="button"
            className="quiet-link"
            onClick={() => nav(`/customers/${customer.id}`)}
          >
            {m.customerDetail.viewAllDetails}
          </button>
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

        <h2>{m.customerDetail.eachHaptaTitle}</h2>
        <div className="hapta-rows block">
          {Array.from({ length: through }, (_, i) => i + 1).map((cyc) => {
            const due = rawCycleDue(chit, customer.id, cyc);
            const paid = paidInCycle(chit, customer.id, cyc);
            const left = Math.max(0, due - paid);
            return (
              <div key={cyc} className="hapta-row">
                <strong>{tx(m.customerDetail.haptaN, { n: cyc })}</strong>
                <span className="hapta-row-mid">
                  {m.customerDetail.due} {inr(due)}
                  {" · "}
                  {m.customerDetail.paidCol}{" "}
                  <span className={left ? "neg" : ""}>{inr(paid)}</span>
                </span>
                <span className={`pill ${left ? "partial" : "paid"}`}>
                  {left ? m.customerDetail.stillDueWord : m.customerDetail.paidWord}
                </span>
              </div>
            );
          })}
        </div>

        <div className="card block">
          <h2>{m.customerDetail.ledger}</h2>
          <p className="muted">{m.customerDetail.ledgerThisBhishi}</p>
          {ledger.map((row) => (
            <div key={row.key} className="kv">
              <span>
                {row.label}
                <div className="muted">
                  {new Date(row.when).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  {row.mode ? ` · ${modeLabel(row.mode) || row.mode}` : ""}
                </div>
              </span>
              <strong>{row.credit ? inr(row.credit) : row.debit ? inr(row.debit) : "—"}</strong>
            </div>
          ))}
          {!ledger.length && <p className="empty">{m.chit.ledgerEmpty}</p>}
        </div>
      </div>
    </AppShell>
  );
}
