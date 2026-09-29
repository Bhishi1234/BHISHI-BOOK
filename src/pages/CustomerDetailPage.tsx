import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { displayCycle, memberBalance, paidInCycle, rawCycleDue, customerOutstanding, cycleStartDate } from "../lib/chitMath";
import { initials, inr } from "../lib/format";
import { useStore } from "../store";

/** Full People profile — every bhishi this member is in. */
export function CustomerDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { customers, chits, updateCustomer, error } = useStore();
  const { m, tx, modeLabel, locale } = useI18n();
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
            customer.phone ? (
              <div style={{ marginTop: 12 }}>
                <MemberReachButtons
                  phone={customer.phone}
                  whatsappText={`Hi ${customer.name}`}
                  wide
                />
              </div>
            ) : null
          )}
          {!editPhone && (
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
          <p className="owe-line center">
            {m.customerDetail.stillToPayLabel}{" "}
            <span className="neg">{inr(outstanding)}</span>
          </p>
          <div className="fact-grid">
            <div>
              <span>{m.customerDetail.contributed}</span>
              <strong>{inr(contributed)}</strong>
            </div>
            <div>
              <span>{m.customerDetail.received}</span>
              <strong>{inr(received)}</strong>
            </div>
            <div>
              <span>{m.customerDetail.stillDueWord}</span>
              <strong className={outstanding ? "neg" : ""}>{inr(outstanding)}</strong>
            </div>
            <div>
              <span>{m.chit.activeChits}</span>
              <strong>{running}</strong>
            </div>
          </div>
        </div>

        <div className="block">
          <div className="row-head" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>{m.customerDetail.bhishiCards}</h2>
            <span className="muted">{memberships.length}</span>
          </div>
          {!memberships.length && (
            <div className="card"><p className="muted" style={{ margin: 0 }}>{m.chit.notMapped}</p></div>
          )}
          <div className="member-chit-grid">
            {memberships.map(({ ch, bal, member, payouts }) => {
              const hapta = displayCycle(ch);
              const dueNow = rawCycleDue(ch, customer.id, hapta);
              const paidNow = paidInCycle(ch, customer.id, hapta);
              return (
              <button
                key={ch.id}
                type="button"
                className="card member-chit-card"
                onClick={() => nav(`/chits/${ch.id}/members/${customer.id}`)}
              >
                <div className="group-tile-top">
                  <strong>{ch.name}</strong>
                  <span className="pill hapta">{tx(m.customerDetail.haptaN, { n: hapta })} / {ch.duration}</span>
                </div>
                <p className={`group-tile-status ${paidNow >= dueNow ? "ok" : "neg"}`}>
                  {paidNow >= dueNow ? m.customerDetail.thisHaptaPaid : m.customerDetail.thisHaptaNotPaid}
                </p>
                <div className="kv">
                  <span>{m.dash.paidSoFarLine.replace("{amount}", "").trim() || m.customerDetail.contributed}</span>
                  <strong>{inr(bal.paid)}</strong>
                </div>
                <div className="kv">
                  <span>{member.prizedCycle ? tx(m.customerDetail.potInHapta, { n: member.prizedCycle }) : m.customerDetail.noWinsYet}</span>
                  <strong>{member.prizedCycle ? inr(payouts) : ""}</strong>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        <div className="card block">
          <h2>{m.customerDetail.ledger}</h2>
          <p className="muted">{m.customerDetail.ledgerAllHint}</p>
          {ledger.map((row) => (
            <div key={row.key} className="kv">
              <span>
                <Link className="link" to={`/chits/${row.chitId}`}>{row.chitName}</Link>
                <div className="muted">
                  {new Date(row.when).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}
                  {row.label}
                  {row.mode ? ` · ${modeLabel(row.mode) || row.mode}` : ""}
                </div>
              </span>
              <strong className={row.debit ? "" : undefined}>
                {row.credit ? inr(row.credit) : row.debit ? inr(row.debit) : "—"}
              </strong>
            </div>
          ))}
          {!ledger.length && <p className="empty">{m.chit.ledgerEmpty}</p>}
        </div>

        {memberships.map(({ ch }) => (
          <div key={`pass-${ch.id}`} className="block">
            <h2>{m.customerDetail.eachHaptaTitle} · {ch.name}</h2>
            <div className="hapta-rows">
            {Array.from({ length: displayCycle(ch) }, (_, i) => i + 1).map((cyc) => {
              const due = rawCycleDue(ch, customer.id, cyc);
              const paid = paidInCycle(ch, customer.id, cyc);
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
          </div>
        ))}
      </div>
    </AppShell>
  );
}
