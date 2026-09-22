import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  BookUser,
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Percent,
  PiggyBank,
  Users,
  Wallet,
} from "lucide-react";
import { PayModal } from "../components/PayModal";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { AppShell } from "../layout/AppShell";
import { StatCard } from "../ui/StatCard";
import { useI18n } from "../i18n";
import {
  balanceAfterCycle,
  canCloseLastMonth,
  canGiveLoan,
  canSettleCycle,
  collectedThisCycle,
  collectedCount,
  commissionEarned,
  computeInstalment,
  cycleDue,
  cycleLedger,
  displayCycle,
  dividendsDistributed,
  expectedLifeCollections,
  expectedThisCycle,
  interestCollected,
  isFixedLike,
  isLuckyDrawChit,
  isHandSacrifice,
  handSacrificeAmount,
  isAuctionFirst,
  isLastAuctionCycle,
  loanDetailRows,
  loanEffectiveTenure,
  loanMonthlyInterest,
  loanPrincipalOf,
  loanSettlementPlan,
  loansThisCycle,
  handLabel,
  firstSlotOf,
  memberBalance,
  memberDividendTotal,
  memberLedgerRows,
  moneyIn,
  moneyOut,
  nextBySlot,
  outstandingOf,
  paidInCycle,
  paymentStatus,
  settlementsOf,
  settleWinner,
  auctionFirstShare,
  treasuryOf,
} from "../lib/chitMath";
import { downloadChitCsv } from "../lib/exportCsv";
import {
  downloadChitReportPdf,
  downloadMonthDuesPdf,
  downloadReceiptPdf,
} from "../lib/reportsPdf";
import { contactsPickerAvailable, pickContactsFromBook } from "../lib/contacts";
import { dueReminderWhatsAppMessage, inviteMemberWhatsAppMessage, openWhatsApp, tryPhone10 } from "../lib/share";
import { initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { PayMode, PaymentKind } from "../types";

export function ChitDetailPage() {
  const { id } = useParams();
  const {
    chits, customers, recordPayment, recordAllPayments, recordAuction, settleBooksEqually, closeCycle,
    cancelChit, addMember, addCustomer, undoPayment, updateChitSettings, error, user,
  } = useStore();
  const { m: copy, tx, typeLabel, freqLabel, modeLabel, statusLabel, tabLabel, locale } = useI18n();
  const nav = useNavigate();
  const chit = chits.find((c) => c.id === id);
  const [tab, setTab] = useState<"overview" | "collections" | "monthly" | "cycles" | "members" | "settlement" | "settings">("overview");
  const [monthSub, setMonthSub] = useState<"collect" | "award" | "close">("collect");
  const [payFor, setPayFor] = useState<{ customerId: string; slot: number } | null>(null);
  const [bid, setBid] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [winnerSlot, setWinnerSlot] = useState<number | undefined>(undefined);
  const [newMemberId, setNewMemberId] = useState("");
  const [visible, setVisible] = useState(true);
  const [unpaidNoted, setUnpaidNoted] = useState(false);
  const [colRange, setColRange] = useState<"today" | "week" | "all">("all");
  const [busyAll, setBusyAll] = useState(false);
  const [busySettle, setBusySettle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chit) return;
    setVisible(Boolean(chit.memberVisible));
    setEditName(chit.name);
    setEditTitle(chit.title || "");
  }, [chit?.id, chit?.memberVisible, chit?.name, chit?.title]);

  useEffect(() => {
    if (tab !== "monthly" || !chit) return;
    const cyc = displayCycle(chit);
    const lw = chit.auctions.find((a) => a.cycle === cyc && a.method !== "settlement");
    const af = isAuctionFirst(chit);
    const dueLeft = chit.members.filter((m) => {
      const due = cycleDue(chit, m.customerId, cyc, m.slot);
      return due - paidInCycle(chit, m.customerId, cyc, m.slot) > 0;
    }).length;
    if (af) {
      if (!lw) setMonthSub("award");
      else if (dueLeft > 0) setMonthSub("collect");
      else setMonthSub("close");
    } else if (lw || (chit.type === "loan" && canSettleCycle(chit))) {
      setMonthSub(lw ? "close" : "award");
    } else if (canSettleCycle(chit)) {
      setMonthSub("award");
    } else {
      setMonthSub("collect");
    }
  }, [tab, chit?.id, chit?.currentCycle]);

  useEffect(() => {
    if (!chit) return;
    // Only seed the amount when opening a chit — never overwrite what the user typed
    setBid(chit.type === "loan" || isFixedLike(chit) ? String(chit.pot) : "");
    const next = isFixedLike(chit) ? nextBySlot(chit) : undefined;
    setWinnerId(next?.customerId || "");
    setWinnerSlot(next?.slot);
  }, [chit?.id, chit?.currentCycle, chit?.auctions?.length]);

  function pickHand(value: string) {
    if (!value) {
      setWinnerId("");
      setWinnerSlot(undefined);
      return;
    }
    const [cid, slotStr] = value.split("::");
    setWinnerId(cid);
    setWinnerSlot(slotStr ? Number(slotStr) : undefined);
  }

  const handSelectValue =
    winnerId && winnerSlot != null ? `${winnerId}::${winnerSlot}` : winnerId;

  const names = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.name])), [customers]);

  if (!chit) {
    return <AppShell crumb={copy.nav.chits}><div className="page"><p>{copy.chit.notFound}</p></div></AppShell>;
  }

  if (chit.viewerRole === "member") {
    return <Navigate to={`/member/${chit.id}`} replace />;
  }

  const data = chit;
  const cycle = displayCycle(data);
  const isRunning = data.status === "running";
  const pending = isRunning
    ? data.members.filter((m) => paymentStatus(data, m.customerId, cycle, m.slot) === "due").length
    : 0;
  const lastMonthGate = canCloseLastMonth(data);
  const loanAllowed = canGiveLoan(data);
  const lastWin = data.auctions.find((a) => a.cycle === cycle && a.method !== "settlement");
  const monthLoans = loansThisCycle(data);
  const cashOnHand = treasuryOf(data);
  const showSettlement = data.type === "loan";
  const monthDate = new Date(data.startDate);
  monthDate.setMonth(monthDate.getMonth() + cycle - 1);
  const remainDue = isRunning
    ? data.members.filter((m) => {
        const due = cycleDue(data, m.customerId, cycle, m.slot);
        return due - paidInCycle(data, m.customerId, cycle, m.slot) > 0;
      }).length
    : 0;
  const unprized = [...data.members].filter((m) => !m.prizedCycle).sort((a, b) => a.slot - b.slot);
  const expectedLife = expectedLifeCollections(data);
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);
  const fixedLike = isFixedLike(data);
  const luckyDrawChit = isLuckyDrawChit(data);
  const handSacrifice = isHandSacrifice(data);
  const nextSlot = nextBySlot(data);
  const lastAuctionMonth = data.type === "auction" && isLastAuctionCycle(data);
  const lastMember = lastAuctionMonth ? unprized[0] : undefined;
  const auctionFirst = isAuctionFirst(data);
  const shareHint = lastWin && auctionFirst
    ? auctionFirstShare(data, cycle)
    : null;

  const styleLabel = auctionFirst
    ? copy.auctionStyle.auction_first
    : data.type === "auction"
      ? copy.auctionStyle.collect_first
      : data.type === "fixed"
        ? copy.fixedStyle.fixed_order
        : data.type === "lucky_draw"
          ? copy.fixedStyle.lucky_draw
          : handSacrifice
            ? copy.fixedStyle.hand_sacrifice
            : typeLabel(data.type);
  const commissionLabel = data.commissionKind === "amount" && data.commissionValue
    ? inr(data.commissionValue)
    : `${data.commissionPct}%`;
  const tabItems = (
    ["overview", "collections", "monthly", "cycles", "members", ...(showSettlement ? ["settlement" as const] : []), "settings"] as const
  );

  function scrollTabs(dir: -1 | 1) {
    tabsRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  }

  function goAfterCollect() {
    setMonthSub(auctionFirst ? "close" : "award");
  }
  function goAfterAward() {
    setMonthSub(auctionFirst ? "collect" : "close");
  }
  function goAfterClose() {
    setUnpaidNoted(false);
    setMonthSub(auctionFirst ? "award" : "collect");
  }

  return (
    <AppShell crumb={copy.nav.chits} crumb2={data.name}>
      <div className="page chit-detail-page">
        <section className="chit-hero">
          <div className="chit-hero-top">
            <div className="chit-hero-avatar">{initials(data.name)}</div>
            <div className="chit-hero-heading">
              <h1>{data.name}</h1>
              <p>
                {typeLabel(data.type)}
                {styleLabel && styleLabel !== typeLabel(data.type) ? ` · ${styleLabel}` : ""}
                {data.title ? ` · ${data.title}` : ""}
              </p>
            </div>
            <span className={`chit-hero-pill ${isRunning ? "live" : ""}`}>
              {statusLabel(data.status) || data.status}
            </span>
          </div>
          <div className="chit-hero-divider" />
          <div className="chit-hero-grid">
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Users size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.nav.customers}</span>
                <strong>{tx(copy.chit.membersOf, { count: data.members.length, total: data.membersCount })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Wallet size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.chit.instalment}</span>
                <strong>{inr(data.instalment)}/{freqLabel(data.frequency) || data.frequency}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.chit.started}</span>
                <strong>{new Date(data.startDate).toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><CalendarRange size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.chit.ends}</span>
                <strong>{ended.toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Percent size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.terms.commission}</span>
                <strong>{commissionLabel}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>{copy.chit.month}</span>
                <strong>{cycle} / {data.duration}</strong>
              </div>
            </div>
          </div>
          {(data.type === "loan" && (data.interestRate != null || data.repaymentTenure)) && (
            <p className="chit-hero-note">
              {data.interestRate != null ? `Interest ${data.interestRate}%` : ""}
              {data.interestRate != null && data.repaymentTenure ? " · " : ""}
              {data.repaymentTenure ? `Repay ${data.repaymentTenure} mo` : ""}
            </p>
          )}
        </section>

        {error && <p className="due">{error}</p>}
        {!isRunning && (
          <p className="muted block">{tx(copy.chit.closedBanner, { status: statusLabel(data.status) || data.status })}</p>
        )}

        <div className="chit-tabbar">
          <button type="button" className="chit-tab-arrow" aria-label="Scroll tabs left" onClick={() => scrollTabs(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div className="chit-tabbar-scroll" ref={tabsRef}>
            {tabItems.map((t) => (
              <button
                key={t}
                type="button"
                className={`wizard-tab${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                <span className="wizard-tab-label">{tabLabel(t)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="chit-tab-arrow" aria-label="Scroll tabs right" onClick={() => scrollTabs(1)}>
            <ChevronRight size={18} />
          </button>
        </div>

        {tab === "overview" && (
          <div className="stats six">
            <StatCard label={copy.chit.month} value={`${cycle} / ${data.duration}`} hint={copy.chit.currentHapta} tone="blue" icon={Calendar} />
            <StatCard
              label={copy.chit.collectedThisHapta}
              value={inr(collectedThisCycle(data))}
              hint={tx(copy.chit.ofExpected, { amount: inr(expectedThisCycle(data)) })}
              tone="green"
              icon={PiggyBank}
            />
            <StatCard
              label={copy.terms.outstanding}
              value={inr(outstandingOf(data))}
              hint={tx(copy.chit.membersPending, { count: pending })}
              tone="rose"
              icon={AlertCircle}
            />
            <StatCard
              label={auctionFirst ? copy.chit.tillPeer : copy.chit.cashOnHand}
              value={<span className={treasuryOf(data) < 0 ? "neg" : undefined}>{inr(treasuryOf(data))}</span>}
              hint={auctionFirst ? copy.chit.tillAlwaysZero : copy.chit.treasuryToday}
              tone="teal"
              icon={Wallet}
            />
            <StatCard
              label={copy.chit.commissionEarned}
              value={inr(commissionEarned(data))}
              hint={tx(copy.chit.thisHaptaAmount, { amount: inr(data.auctions.find((a) => a.cycle === cycle)?.commission || 0) })}
              tone="violet"
              icon={Percent}
            />
            <StatCard
              label={copy.nav.customers}
              value={data.members.length}
              hint={tx(copy.chit.ofSlots, { count: data.membersCount })}
              tone="amber"
              icon={Users}
            />
          </div>
        )}

        {tab === "overview" && (
          <>
            <p className="muted block">{copy.chit.booksIntro}</p>
            <div className="card block">
              <div className="muted">{auctionFirst ? copy.chit.tillToday : copy.chit.cashOnHandToday}</div>
              <div className="hero-figure">{inr(treasuryOf(data))}</div>
            </div>
            <div className="grid-2 block">
              <div className="card">
                <h2>{tx(copy.chit.monthOf, { cycle, duration: data.duration })}</h2>
                <div className="progress blue" style={{ margin: "4px 0 12px" }}><i style={{ width: `${Math.round((cycle / data.duration) * 100)}%` }} /></div>
                <p className="muted block">
                  {data.type === "loan"
                    ? `${inr(memberLedgerRows(data).reduce((s, r) => s + r.paid, 0))} deposits of ${inr(expectedLife)} expected · ${inr(moneyIn(data))} total cash in (incl. loan repayments)`
                    : `${inr(moneyIn(data))} collected of ${inr(expectedLife)} expected`}
                </p>
                {data.type !== "auction" && (
                  <div className="grid-2">
                    <div><div className="muted">{copy.chit.totalPaidOut}</div><strong className="num">{inr(moneyOut(data) - commissionEarned(data))}</strong></div>
                    <div><div className="muted">{copy.chit.payoutsRecorded}</div><strong className="num">{inr(data.auctions.filter((a) => a.method !== "settlement").length)}</strong></div>
                  </div>
                )}
                {data.type === "auction" && (
                  <p className="muted" style={{ marginTop: 4 }}>
                    Member-by-member paid vs received is below — early winners take less; the last member takes the full remaining pot.
                  </p>
                )}
              </div>
              <div className="card">
                <h2>{copy.chit.youveEarned}</h2>
                <div className="kv"><span>{copy.terms.commission}</span><strong>{inr(commissionEarned(data))}</strong></div>
                {data.type === "auction" && (
                  <>
                    <div className="kv"><span>{copy.chit.dividendsEach}</span><strong>{inr(memberDividendTotal(data))}</strong></div>
                    <div className="kv"><span>{copy.chit.dividendsAll}</span><strong>{inr(dividendsDistributed(data))}</strong></div>
                  </>
                )}
                {data.type === "loan" && (
                  <>
                    <div className="kv"><span>{copy.chit.interestCollected}</span><strong>{inr(interestCollected(data))}</strong></div>
                    <p className="muted" style={{ marginTop: 8 }}>
                      {copy.chit.interestExplain}
                    </p>
                  </>
                )}
              </div>
            </div>
            {(data.type === "auction" || handSacrifice || data.type === "loan") && (
              <div className="card flush block">
                <div className="card-pad">
                  <h2>{copy.chit.memberLedger}</h2>
                  <p className="muted">
                    {data.type === "loan"
                      ? copy.chit.ledgerLoanHint
                      : handSacrifice
                      ? copy.chit.ledgerSacrificeHint
                      : copy.chit.ledgerDefaultHint}
                  </p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{copy.common.member}</th>
                        <th>{copy.chit.paidIn}</th>
                        {data.type === "loan" ? (
                          <>
                            <th>{copy.chit.loanReceived}</th>
                            <th>{copy.chit.interestPaid}</th>
                            <th>{copy.chit.interestDividend}</th>
                          </>
                        ) : (
                          <>
                            <th>{copy.chit.gotFromPot}</th>
                            <th>{handSacrifice ? copy.chit.cashDividends : copy.chit.dividends}</th>
                          </>
                        )}
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberLedgerRows(data).map((row) => (
                        <tr key={`${row.customerId}-${row.slot}`}>
                          <td>
                            <strong>
                              {handLabel(
                                names[row.customerId] || "Member",
                                row.slot,
                                data.members.filter((m) => m.customerId === row.customerId).length,
                              )}
                            </strong>
                            {row.prizedCycle ? <div className="muted">{tx(copy.chit.prizedMonth, { n: row.prizedCycle })}</div> : null}
                          </td>
                          <td>{inr(row.paid)}</td>
                          {data.type === "loan" ? (
                            <>
                              <td>{inr(row.loanOut || 0)}</td>
                              <td>{inr(row.interestPaid || 0)}</td>
                              <td>{inr(row.dividend)}</td>
                            </>
                          ) : (
                            <>
                              <td>{inr(row.received - (handSacrifice ? row.dividend : 0))}</td>
                              <td>{inr(row.dividend)}</td>
                            </>
                          )}
                          <td className={row.net < 0 ? "neg" : ""}>{inr(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {data.type === "loan" && !!loanDetailRows(data).length && (
              <div className="card flush block">
                <div className="card-pad">
                  <h2>{copy.chit.loanDetails}</h2>
                  <p className="muted">{copy.chit.loanDetailsHint}</p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{copy.common.member}</th>
                        <th>{copy.chit.month}</th>
                        <th>{copy.chit.faceLoan}</th>
                        <th>{copy.chit.interestCut}</th>
                        <th>{copy.chit.netPaidOut}</th>
                        <th>{copy.chit.repay}</th>
                        <th>{copy.chit.sharePerMo}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanDetailRows(data).map((row, i) => (
                        <tr key={row.id || `${row.memberId}-${row.slot}-${row.cycle}-${i}`}>
                          <td>
                            <strong>
                              {handLabel(
                                names[row.memberId] || "Member",
                                row.slot ?? 1,
                                data.members.filter((m) => m.customerId === row.memberId).length,
                              )}
                            </strong>
                          </td>
                          <td>{row.cycle}</td>
                          <td>{inr(row.face)}</td>
                          <td>{inr(row.upfrontInterest)}</td>
                          <td>{inr(row.netPaidOut)}{row.commission ? <div className="muted">comm {inr(row.commission)}</div> : null}</td>
                          <td>
                            {row.tenure} mo
                            <div className="muted">M{row.repayFrom}–M{row.repayTo}</div>
                          </td>
                          <td>
                            {inr(row.principalSharePerMonth)}
                            <div className="muted">+ {inr(row.interestPerMonth)} int/mo</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="card">
              <h2>{copy.chit.moneyInOut}</h2>
              {auctionFirst ? (
                <>
                  <div className="kv"><span>{copy.chit.paidInInclWinner}</span><strong>{inr(moneyIn(data))}</strong></div>
                  <div className="kv"><span>{copy.chit.winningBids}</span><strong>{inr(moneyOut(data))}</strong></div>
                  <div className="kv"><span>{copy.chit.tillPeerShort}</span><strong>{inr(treasuryOf(data))}</strong></div>
                  <p className="muted" style={{ marginTop: 12 }}>
                    {copy.chit.peerTillHint}
                  </p>
                </>
              ) : (
                <>
                  <div className="kv"><span>{copy.chit.moneyIn}</span><strong>{inr(moneyIn(data))}</strong></div>
                  <div className="kv"><span>{copy.chit.moneyOut}</span><strong>{inr(moneyOut(data))}</strong></div>
                  <div className="kv">
                    <span>{copy.chit.onHand}</span>
                    <strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong>
                  </div>
                  <p className="muted" style={{ marginTop: 12 }}>
                    Of which {inr(commissionEarned(data))} is your commission.
                  </p>
                </>
              )}
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="kv"><span>{copy.detail.type}</span><strong>{typeLabel(data.type).toUpperCase()}</strong></div>
                <div className="kv"><span>{copy.detail.frequency}</span><strong>{freqLabel(data.frequency)}</strong></div>
                <div className="kv"><span>{copy.chit.contribution}</span><strong>{inr(data.instalment)}</strong></div>
                <div className="kv"><span>Duration</span><strong>{tx(copy.chit.durationMonths, { n: data.duration })}</strong></div>
                {data.type === "loan" && (
                  <>
                    <div className="kv"><span>{copy.chit.interest}</span><strong>{data.interestRate ?? 0}%</strong></div>
                    <div className="kv"><span>{copy.chit.repaymentTenure}</span><strong>{data.repaymentTenure ? tx(copy.chit.durationMonths, { n: data.repaymentTenure }) : copy.chit.restOfChit}</strong></div>
                  </>
                )}
                {fixedLike && data.premiumAmount != null && data.premiumAmount > 0 && (
                  <div className="kv"><span>Premium after prized (legacy)</span><strong>{inr(data.premiumAmount)}</strong></div>
                )}
                <div className="kv"><span>{copy.chit.commissionPerHapta}</span><strong>{
                  data.commissionKind === "amount" && data.commissionValue
                    ? inr(data.commissionValue)
                    : `${data.commissionPct}%`
                }</strong></div>
              </div>
            </div>
          </>
        )}

        {tab === "collections" && (() => {
          const now = new Date();
          const receipts = data.payments.filter((p) => {
            const d = new Date(p.date);
            if (colRange === "today") return d.toDateString() === now.toDateString();
            if (colRange === "week") return now.getTime() - d.getTime() <= 7 * 86400000;
            return true;
          });
          const total = receipts.reduce((s, p) => s + p.amount, 0);
          const people = new Set(receipts.map((p) => p.memberId)).size;
          const byCycle = new Map<number, typeof receipts>();
          for (const p of receipts) {
            const list = byCycle.get(p.cycle) || [];
            list.push(p);
            byCycle.set(p.cycle, list);
          }
          const cycles = [...byCycle.keys()].sort((a, b) => b - a);
          return (
            <div className="stack">
              <div className="card">
                <div className="seg" style={{ marginBottom: 16 }}>
                  <button className={`chip ${colRange === "today" ? "on" : ""}`} onClick={() => setColRange("today")}>{copy.common.today}</button>
                  <button className={`chip ${colRange === "week" ? "on" : ""}`} onClick={() => setColRange("week")}>{copy.common.thisWeek}</button>
                  <button className={`chip ${colRange === "all" ? "on" : ""}`} onClick={() => setColRange("all")}>{copy.common.all}</button>
                </div>
                <div className="muted">{copy.terms.collected}</div>
                <div className="hero-figure">{inr(total)}</div>
                <p className="muted">{tx(copy.chit.receiptsFrom, { receipts: receipts.length, people })}</p>
                <button
                  className="btn"
                  style={{ marginTop: 12 }}
                  disabled={!remainDue || busyAll}
                  onClick={() => {
                    setBusyAll(true);
                    void recordAllPayments(data.id).finally(() => setBusyAll(false));
                  }}
                >
                  {busyAll ? copy.chit.recording : copy.chit.recordAll}
                </button>
              </div>
              {cycles.map((cyc) => {
                const rows = byCycle.get(cyc) || [];
                const monthTotal = rows.reduce((s, p) => s + p.amount, 0);
                const when = new Date(data.startDate);
                when.setMonth(when.getMonth() + cyc - 1);
                return (
                  <div key={cyc} className="card flush">
                    <div className="card-pad" style={{ paddingBottom: 10 }}>
                      <div className="row-head" style={{ margin: 0 }}>
                        <div>
                          <strong>{copy.chit.month} {cyc}</strong>
                          <div className="muted">
                            {when.toLocaleDateString(locale, { month: "short", year: "numeric" })} · {rows.length} receipt{rows.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <strong className="num">{inr(monthTotal)}</strong>
                      </div>
                    </div>
                    {rows.map((p) => {
                      const hands = data.members.filter((m) => m.customerId === p.memberId).length;
                      const label = p.slot != null
                        ? handLabel(names[p.memberId] || "Member", p.slot, hands)
                        : names[p.memberId];
                      return (
                        <div key={p.id} className="list-row">
                          <div className="avatar">{initials(names[p.memberId] || "?")}</div>
                          <div className="grow">
                            <strong>{label}</strong>
                            <div className="muted">
                              {modeLabel(p.mode || "cash")} · {new Date(p.date).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                            </div>
                          </div>
                          <strong className="num">{inr(p.amount)}</strong>
                          <button
                            className="link"
                            type="button"
                            onClick={() => downloadReceiptPdf(data, p, names)}
                          >
                            PDF
                          </button>
                          {isRunning && (
                            <button className="link" onClick={() => void undoPayment(data.id, p.id)}>{copy.chit.undo}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {!receipts.length && <p className="empty">{copy.chit.noCollections}</p>}
            </div>
          );
        })()}

        {tab === "monthly" && (
          <div className="stack">
            {(() => {
              const awardLabel = auctionFirst
                ? copy.chit.award
                : data.type === "loan"
                  ? (loanAllowed ? copy.chit.award : copy.chit.closeStep)
                  : luckyDrawChit
                    ? copy.type.lucky_draw
                    : fixedLike
                      ? copy.chit.award
                      : copy.chit.award;
              const subs = auctionFirst
                ? [
                    { id: "award" as const, label: `1. ${awardLabel}` },
                    { id: "collect" as const, label: `2. ${copy.chit.collect}` },
                    { id: "close" as const, label: `3. ${copy.chit.closeStep}` },
                  ]
                : [
                    { id: "collect" as const, label: `1. ${copy.chit.collect}` },
                    { id: "award" as const, label: `2. ${awardLabel}` },
                    { id: "close" as const, label: `3. ${copy.chit.closeStep}` },
                  ];
              const awardDone = Boolean(lastWin) || (data.type === "loan" && !loanAllowed);
              const collectDone = auctionFirst
                ? Boolean(lastWin) && remainDue === 0
                : collectedThisCycle(data) > 0 || unpaidNoted;
              return (
                <div className="month-steps" role="tablist" aria-label={copy.chit.monthlySteps}>
                  {subs.map((s) => {
                    const done = s.id === "collect" ? collectDone : s.id === "award" ? awardDone : false;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={monthSub === s.id}
                        className={`month-step${monthSub === s.id ? " on" : ""}${done && monthSub !== s.id ? " done" : ""}`}
                        onClick={() => setMonthSub(s.id)}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {monthSub === "collect" && (
            <>
            <div className="stats four">
              <StatCard label={copy.chit.expectedThisHapta} value={inr(expectedThisCycle(data))} hint="target" tone="blue" icon={Wallet} />
              <StatCard label={copy.terms.collected} value={inr(collectedThisCycle(data))} hint="received" tone="green" icon={PiggyBank} />
              <StatCard label={copy.terms.outstanding} value={inr(outstandingOf(data))} hint={copy.chit.stillDue} tone="rose" icon={AlertCircle} />
              <StatCard
                label={auctionFirst ? copy.chit.tillAlwaysZeroShort : copy.chit.cashOnHand}
                value={<span className={treasuryOf(data) < 0 ? "neg" : undefined}>{inr(treasuryOf(data))}</span>}
                hint={auctionFirst ? copy.chit.unpaidAsOutstanding : copy.chit.treasuryToday}
                tone="teal"
                icon={Wallet}
              />
            </div>
            <div className="card flush">
              <div className="card-pad month-head">
                <div>
                  <strong>{copy.chit.month} {cycle}</strong>
                  <span className="muted"> {monthDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className={`pill ${isRunning ? "paid" : "partial"}`}>{isRunning ? copy.chit.open : copy.chit.closed}</span>
                  <div className="muted" style={{ marginTop: 6 }}>{tx(copy.chit.handsCollected, { done: collectedCount(data), total: data.members.length })}</div>
                </div>
                <div className="seg">
                  <button
                    className="btn"
                    disabled={!isRunning || !remainDue || busyAll || (auctionFirst && !lastWin)}
                    onClick={() => {
                      setBusyAll(true);
                      void recordAllPayments(data.id).finally(() => {
                        setBusyAll(false);
                        goAfterCollect();
                      });
                    }}
                  >
                    {busyAll ? copy.chit.recording : copy.chit.recordAll}
                  </button>
                  <button className="btn ghost" type="button" disabled={!isRunning || !remainDue || (auctionFirst && !lastWin)} onClick={() => {
                    setUnpaidNoted(true);
                    goAfterCollect();
                  }}>
                    Mark all unpaid
                  </button>
                </div>
              </div>
              {auctionFirst && !lastWin && (
                <p className="month-hint">Record the auction first (Award tab). Then each member owes winning bid ÷ members — the winner’s share counts as paid-in (self-contribution), so cash on hand stays ₹0.</p>
              )}
              {auctionFirst && lastWin && shareHint != null && (
                <p className="month-hint">
                  Winning bid {inr(lastWin.bid)} ÷ {data.members.length} = {inr(shareHint)} due from each member (winner’s share is booked as paid-in). Face value stays {inr(data.pot)}. Till stays ₹0 once settled.
                </p>
              )}
              {!auctionFirst && !canSettleCycle(data) && !lastWin && (
                <p className="month-hint">Record collections first — individually or with {copy.chit.recordAll}. Auction stays locked so cash on hand cannot go negative.</p>
              )}
              {!auctionFirst && lastWin && (
                <p className="month-hint">
                  Cash left after payout and commission stays in the till as next month’s dividend credit (members pay less next cycle). It is not a separate cash payout.
                </p>
              )}
              {unpaidNoted && remainDue > 0 && (
                <p className="month-hint">Remaining members stay unpaid for this month. Collect later from the Record button{auctionFirst ? "." : "; auction still needs at least one receipt."}</p>
              )}
              {!auctionFirst || lastWin ? (
              <div className="table-wrap">
                <table className="table month-table">
                  <thead>
                    <tr>
                      <th>{copy.common.member}</th>
                      <th>Due</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Mode</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m) => {
                      const due = cycleDue(data, m.customerId, cycle, m.slot);
                      const paid = paidInCycle(data, m.customerId, cycle, m.slot);
                      const status = paymentStatus(data, m.customerId, cycle, m.slot);
                      const last = [...data.payments].reverse().find(
                        (p) => p.memberId === m.customerId && p.cycle === cycle && (p.slot == null || p.slot === m.slot),
                      );
                      const label = status === "due" && unpaidNoted ? "Unpaid" : status[0].toUpperCase() + status.slice(1);
                      const isWinner = lastWin?.winnerId === m.customerId
                        && (lastWin.winnerSlot == null || lastWin.winnerSlot === m.slot);
                      const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                      return (
                        <tr key={`${m.customerId}-${m.slot}`}>
                          <td>
                            <div className="person">
                              <div className="avatar">{initials(names[m.customerId] || "?")}</div>
                              <span className="ellipsis">
                                {handLabel(names[m.customerId] || "Member", m.slot, hands)}
                                {isWinner ? <span className="muted"> · winner</span> : null}
                              </span>
                            </div>
                          </td>
                          <td>{inr(due)}</td>
                          <td>{inr(paid)}</td>
                          <td>{paid >= due ? "—" : inr(due - paid)}</td>
                          <td>{last ? modeLabel(last.mode || "cash") : "—"}</td>
                          <td>{last ? new Date(last.date).toLocaleDateString(locale, { day: "numeric", month: "short" }) : "—"}</td>
                          <td><span className={`pill ${status}`}>{label}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {isRunning && !(auctionFirst && !lastWin) && (status === "due" || status === "partial") ? (
                              <button className="btn ghost btn-sm" onClick={() => setPayFor({ customerId: m.customerId, slot: m.slot })}>{copy.chit.record}</button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                            {(() => {
                              const cust = customers.find((c) => c.id === m.customerId);
                              const left = Math.max(0, due - paid);
                              if (!cust?.phone || left <= 0) return null;
                              return (
                                <MemberReachButtons
                                  compact
                                  phone={cust.phone}
                                  whatsappText={dueReminderWhatsAppMessage({
                                    memberName: names[m.customerId] || cust.name,
                                    chitName: data.name,
                                    cycle,
                                    duration: data.duration,
                                    amountDue: left,
                                    organiserName: user?.name,
                                  })}
                                />
                              );
                            })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
                <p className="muted" style={{ padding: "0 16px 16px" }}>Dues table appears after the auction is recorded.</p>
              )}
            </div>
            </>
            )}
            {monthSub === "award" && (
            <div className="card">
              <div className="month-head" style={{ padding: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    {data.type === "loan"
                      ? (!isRunning || !loanAllowed ? "Month close" : "This month’s loan")
                      : fixedLike
                        ? "This month’s payout"
                        : "This month’s auction"}
                  </h2>
                  <p className="muted">
                    {data.type === "loan"
                      ? !isRunning
                        ? "This chit is closed. Use Settlement if cash remains to be returned."
                        : !loanAllowed
                          ? "Last month — no new loans. Collect every hand’s dues, run Settlement (interest + leftover), then close this month."
                          : "Collect first. Giving a loan this month is optional — close the month when the books look right."
                      : fixedLike
                        ? luckyDrawChit
                          ? unprized.length
                            ? `Roll among ${unprized.length} member${unprized.length === 1 ? "" : "s"} who have not won yet. Same dues every month.`
                            : "All members have been prized."
                          : handSacrifice
                            ? unprized.length <= 1
                              ? "Last member takes the full pot — no dividend cut."
                              : nextSlot
                                ? `Next by slot: ${names[nextSlot.customerId]}. They take ${inr(data.pot - handSacrificeAmount(data))}; ${inr(handSacrificeAmount(data))} is paid as cash dividends to the ${unprized.length - 1} still playing.`
                                : "All slots have been prized."
                            : nextSlot
                              ? `Next by slot order: ${names[nextSlot.customerId]} (slot ${nextSlot.slot}). Award after collections.`
                              : "All slots have been prized."
                        : auctionFirst
                          ? "Auction first. Enter the amount the winner takes (e.g. ₹95,000 of ₹1,00,000). Each member then pays that amount ÷ members — the winner’s share is booked as paid-in (paying themselves). Cash on hand stays ₹0."
                          : "Only after collections. Payout plus commission cannot exceed cash on hand."}
                  </p>
                </div>
              </div>
              {!isRunning ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  {tx(copy.chit.closedBanner, { status: statusLabel(data.status) || data.status })}
                </p>
              ) : lastWin && data.type !== "loan" ? (
                <div style={{ marginTop: 12 }}>
                  <div className="kv">
                    <span>
                      {lastWin.method === "lucky_draw"
                        ? "Lucky draw winner"
                        : fixedLike
                          ? "Awarded to"
                          : "Winner · Auction"}
                    </span>
                    <strong>{names[lastWin.winnerId]}</strong>
                  </div>
                  <div className="kv"><span>Payout</span><strong>{inr(lastWin.payout)}</strong></div>
                  <div className="kv"><span>Your commission</span><strong>{inr(lastWin.commission)}</strong></div>
                  {lastWin.dividend > 0 && (
                    <div className="kv"><span>Dividend next month / member</span><strong>{inr(lastWin.dividend)}</strong></div>
                  )}
                  {lastWin.method === "lucky_draw" && (
                    <button
                      className="btn ghost"
                      type="button"
                      style={{ marginTop: 12 }}
                      onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                    >
                      View wheel & share result
                    </button>
                  )}
                  <p className="muted" style={{ marginTop: 12 }}>Already recorded for this month. Use Close month when you are ready.</p>
                </div>
              ) : !auctionFirst && !canSettleCycle(data) ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  Collect at least one payment this month before {data.type === "loan" ? "giving a loan" : fixedLike ? "awarding the pot" : "recording the auction"}.
                </p>
              ) : (
                <div style={{ padding: "16px 0 0" }}>
                  {data.type === "auction" && (
                    <>
                      {lastAuctionMonth ? (
                        <>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            {auctionFirst
                              ? `Last cycle — no bidding. The remaining member is awarded the full pot (${inr(data.pot)}); each member then pays ${inr(computeInstalment(data.pot, data.members.length || 1))} (winner’s share counts as paid-in).`
                              : `Last cycle — no auction. The remaining member takes the full cash on hand (${inr(cashOnHand)}), then you can close the chit.`}
                          </p>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select
                              className="field"
                              value={handSelectValue || (lastMember ? `${lastMember.customerId}::${lastMember.slot}` : "")}
                              onChange={(e) => pickHand(e.target.value)}
                            >
                              <option value="">Last member</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  Slot {m.slot} · {names[m.customerId]}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!(winnerId || lastMember?.customerId) || (!auctionFirst && cashOnHand <= 0)}
                              onClick={() => {
                                const who = winnerId || lastMember?.customerId || "";
                                const slot = winnerSlot ?? lastMember?.slot;
                                void recordAuction(data.id, who, auctionFirst ? data.pot : cashOnHand, "auction", slot)
                                  .then(() => goAfterAward());
                              }}
                            >
                              Award full pot
                            </button>
                          </div>
                          {(winnerId || lastMember) && (() => {
                            const who = winnerId || lastMember!.customerId;
                            const slot = winnerSlot ?? lastMember?.slot;
                            const preview = settleWinner(data, who, auctionFirst ? data.pot : cashOnHand, "auction", slot);
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Winner takes</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                {auctionFirst ? (
                                  <div className="kv"><span>Each member then pays</span><strong>{inr(auctionFirstShare({ ...data, auctions: [...data.auctions, preview] }, cycle))}</strong></div>
                                ) : (
                                  <div className="kv"><span>Cash on hand after</span><strong>{inr(cashOnHand - preview.payout - preview.commission)}</strong></div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">Winner</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  Slot {m.slot} · {names[m.customerId]}
                                </option>
                              ))}
                            </select>
                            <input className="field" placeholder="Winning bid (amount winner takes)" value={bid} onChange={(e) => setBid(e.target.value)} />
                            <button
                              className="btn"
                              disabled={!winnerId || !bid}
                              onClick={() => void recordAuction(data.id, winnerId, Number(bid), "auction", winnerSlot).then(() => goAfterAward())}
                            >
                              Record auction
                            </button>
                          </div>
                          {winnerId && Number(bid) > 0 && (() => {
                            const preview = settleWinner(data, winnerId, Number(bid), "auction", winnerSlot);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            const nextShare = auctionFirst
                              ? auctionFirstShare({ ...data, auctions: [...data.auctions.filter((a) => a.cycle !== cycle), preview] }, cycle)
                              : null;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Winner takes</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                {auctionFirst ? (
                                  <div className="kv"><span>Each member then pays</span><strong>{inr(nextShare || 0)}</strong></div>
                                ) : (
                                  <>
                                    <div className="kv"><span>Dividend / member next month</span><strong>{inr(preview.dividend)}</strong></div>
                                    <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => nav(`/chits/${data.id}/lucky-draw`)}>Lucky draw</button>
                        </>
                      )}
                    </>
                  )}
                  {data.type === "loan" && (
                    <>
                      {!!monthLoans.length && (
                        <div className="card" style={{ marginBottom: 12, background: "#f8fafc" }}>
                          <strong>Loans this month</strong>
                          {monthLoans.map((l, i) => (
                            <div className="kv" key={l.id || `${l.winnerId}-${l.winnerSlot}-${i}`}>
                              <span>
                                {names[l.winnerId]}
                                {l.winnerSlot != null ? ` · Slot ${l.winnerSlot}` : ""}
                              </span>
                              <strong>{inr(l.payout)}{l.commission ? ` · commission ${inr(l.commission)}` : ""}</strong>
                            </div>
                          ))}
                          <div className="kv"><span>Total loaned this month</span><strong>{inr(monthLoans.reduce((s, l) => s + l.payout, 0))}</strong></div>
                          <div className="kv"><span>Cash still on hand</span><strong>{inr(cashOnHand)}</strong></div>
                        </div>
                      )}
                      {!loanAllowed ? (
                        <p className="muted" style={{ marginBottom: 10 }}>
                          Last month — no new loans. Collect dues, then open Settlement to return leftover cash and interest dividends.
                        </p>
                      ) : (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            Pick the hand (slot) that is borrowing. A loan on one hand never applies to another hand of the same person. One month’s interest is cut from the face amount and stays in the pot.
                          </p>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">Borrower hand</option>
                              {data.members.map((m) => {
                                const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                                const borrowed = loanPrincipalOf(data, m.customerId, m.slot);
                                return (
                                  <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                    {handLabel(names[m.customerId] || "Member", m.slot, hands)}
                                    {borrowed ? ` · already ${inr(borrowed)}` : ""}
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              className="field"
                              inputMode="numeric"
                              placeholder="Loan amount"
                              value={bid}
                              onChange={(e) => setBid(e.target.value.replace(/[^\d]/g, ""))}
                            />
                            <button
                              className="btn"
                              disabled={!winnerId || winnerSlot == null || !Number(bid) || Number(bid) > cashOnHand}
                              onClick={() => {
                                const amount = Number(bid);
                                void recordAuction(data.id, winnerId, amount, "fixed", winnerSlot).then(() => {
                                  setBid(String(data.pot));
                                  setWinnerId("");
                                  setWinnerSlot(undefined);
                                  goAfterAward();
                                });
                              }}
                            >
                              Give loan
                            </button>
                          </div>
                          <div className="quick" style={{ marginTop: 8 }}>
                            {[data.pot, data.pot * 2, data.pot * 3, cashOnHand].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i).map((v) => (
                              <button key={v} type="button" className={`chip ${bid === String(v) ? "on" : ""}`} onClick={() => setBid(String(v))}>
                                {inr(v)}{v === cashOnHand ? " · all cash" : ""}
                              </button>
                            ))}
                          </div>
                          {winnerId && winnerSlot != null && Number(bid) > 0 && (() => {
                            const preview = settleWinner(data, winnerId, Number(bid), "fixed", winnerSlot);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            const start = cycle;
                            const tenure = loanEffectiveTenure(data, start);
                            const face = Number(bid);
                            const share = Math.ceil(face / tenure);
                            const interest = loanMonthlyInterest(data, face);
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Hand</span><strong>Slot {winnerSlot}</strong></div>
                                <div className="kv"><span>Face loan</span><strong>{inr(face)}</strong></div>
                                <div className="kv"><span>Interest cut now (stays in pot)</span><strong>{inr(preview.discount)}</strong></div>
                                <div className="kv"><span>Borrower receives</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>Repayment months</span><strong>{tenure} (remaining of chit: {Math.max(0, data.duration - start)})</strong></div>
                                <div className="kv"><span>From next month · deposit</span><strong>{inr(data.instalment)}</strong></div>
                                <div className="kv"><span>Interest / month after 1st repay</span><strong>{inr(interest)} ({data.interestRate || 0}% of principal)</strong></div>
                                <div className="kv"><span>Principal share / month</span><strong>{inr(share)} over {tenure} mo</strong></div>
                                <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                                {cashAfter < 0 && <p className="due">Not enough cash on hand for this loan.</p>}
                              </div>
                            );
                          })()}
                          <p className="muted" style={{ marginTop: 12 }}>You can skip giving a loan this month and still close it after collections.</p>
                        </>
                      )}
                    </>
                  )}
                  {fixedLike && !lastWin && (
                    <>
                      {luckyDrawChit ? (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            Collect dues first, then roll the lucky draw among unprized members. Everyone pays the same instalment every month.
                          </p>
                          <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr" }}>
                            <button
                              className="btn"
                              disabled={!canSettleCycle(data) || unprized.length === 0}
                              onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                            >
                              Roll lucky draw ({unprized.length} left)
                            </button>
                          </div>
                          {unprized.length > 0 && (
                            <p className="muted" style={{ marginTop: 10 }}>
                              In the pot: {unprized.map((m) => names[m.customerId]).join(", ")}
                            </p>
                          )}
                        </>
                      ) : handSacrifice ? (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            Collect first. Early winners leave one full instalment ({inr(handSacrificeAmount(data))}) as cash dividends for members still playing. Last takes the full pot. If no one is taking, roll the lucky draw.
                          </p>
                          <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">Award pot to</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  Slot {m.slot} · {names[m.customerId]}
                                  {nextSlot?.customerId === m.customerId && nextSlot.slot === m.slot ? " · next" : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!winnerId || !canSettleCycle(data)}
                              onClick={() => void recordAuction(data.id, winnerId, data.pot, "fixed", winnerSlot).then(() => goAfterAward())}
                            >
                              Award pot
                            </button>
                          </div>
                          <button
                            className="btn ghost"
                            style={{ marginTop: 10 }}
                            disabled={!canSettleCycle(data) || unprized.length === 0}
                            onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                          >
                            Lucky draw instead ({unprized.length} left)
                          </button>
                          {winnerId && (() => {
                            const preview = settleWinner(data, winnerId, data.pot, "fixed", winnerSlot);
                            const still = Math.max(0, unprized.length - 1);
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Winner takes</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>Dividend pool</span><strong>{inr(preview.discount)}</strong></div>
                                {still > 0 && preview.discount > 0 ? (
                                  <div className="kv"><span>Each of {still} still playing</span><strong>{inr(preview.dividend)}</strong></div>
                                ) : (
                                  <p className="muted" style={{ marginTop: 8 }}>Last member — full pot, no dividends.</p>
                                )}
                                <div className="kv"><span>Cash on hand after</span><strong>{inr(cashOnHand - preview.payout - preview.commission - preview.discount)}</strong></div>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            Payout order follows member slots. You can override and award a different unprized member. Same dues every month.
                          </p>
                          <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">Award pot to</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  Slot {m.slot} · {names[m.customerId]}
                                  {nextSlot?.customerId === m.customerId && nextSlot.slot === m.slot ? " · next" : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!winnerId || !canSettleCycle(data)}
                              onClick={() => void recordAuction(data.id, winnerId, data.pot, "fixed", winnerSlot).then(() => goAfterAward())}
                            >
                              Award pot
                            </button>
                          </div>
                          {winnerId && (() => {
                            const preview = settleWinner(data, winnerId, data.pot, "fixed", winnerSlot);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Member receives</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            )}
            {monthSub === "close" && (
            <div className="card">
              <div className="month-head" style={{ padding: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Close month {cycle}</h2>
                  <p className="muted">
                    {auctionFirst
                      ? "After auction and collections look right, close this month to move to the next cycle."
                      : data.type === "loan"
                        ? !loanAllowed
                          ? "After collections, run Settlement on the Settlement tab, then close the last month to finish the bhishi."
                          : "After collections (and optional loan), close this month to move on."
                        : "After collections and payout look right, close this month to move to the next cycle."}
                  </p>
                </div>
                <button
                  className="btn green"
                  disabled={
                    !isRunning
                      ? true
                      : !lastMonthGate.ok
                        ? true
                      : data.mode === "organise" && data.type === "auction" && !lastWin
                        ? true
                        : data.mode === "organise" && fixedLike && !lastWin
                          ? true
                          : false
                  }
                  onClick={() => void closeCycle(data.id).then(() => goAfterClose())}
                >
                  Close month
                </button>
              </div>
              {!isRunning ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  {tx(copy.chit.closedBanner, { status: statusLabel(data.status) || data.status })}
                </p>
              ) : !lastMonthGate.ok ? (
                <p className="due" style={{ margin: "12px 0 0" }}>{lastMonthGate.reason}</p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div className="kv"><span>Collected this month</span><strong>{inr(collectedThisCycle(data))}</strong></div>
                  <div className="kv"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong></div>
                  <div className="kv">
                    <span>{auctionFirst ? copy.chit.tillPeerShort : copy.chit.cashOnHand}</span>
                    <strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong>
                  </div>
                  {lastWin && data.type !== "loan" && (
                    <>
                      <div className="kv"><span>Awarded to</span><strong>{names[lastWin.winnerId]}</strong></div>
                      <div className="kv"><span>Payout</span><strong>{inr(lastWin.payout)}</strong></div>
                      <div className="kv"><span>{copy.terms.commission}</span><strong>{inr(lastWin.commission)}</strong></div>
                    </>
                  )}
                  {data.type === "loan" && !!monthLoans.length && (
                    <div className="kv">
                      <span>Loans this month</span>
                      <strong>{inr(monthLoans.reduce((s, l) => s + l.payout, 0))}</strong>
                    </div>
                  )}
                  {data.mode === "organise" && data.type === "auction" && !lastWin && (
                    <p className="muted" style={{ marginTop: 12 }}>Record the auction before closing this month.</p>
                  )}
                  {data.mode === "organise" && fixedLike && !lastWin && (
                    <p className="muted" style={{ marginTop: 12 }}>Award the pot before closing this month.</p>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {tab === "cycles" && (
          <div className="card flush">
            <div className="card-pad"><h2>{copy.chit.monthlyBreakdown}</h2></div>
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Collected</th>
                  <th>{data.type === "loan" ? "Loan given" : "Payout"}</th>
                  <th>Commission</th>
                  {data.type === "auction" && <th>Dividend generated</th>}
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cycle }, (_, i) => i + 1).reverse().map((cyc) => {
                  const row = cycleLedger(data, cyc);
                  const when = new Date(data.startDate);
                  when.setMonth(when.getMonth() + cyc - 1);
                  return (
                    <tr key={cyc}>
                      <td>{when.toLocaleDateString(locale, { month: "short", year: "numeric" })}</td>
                      <td>{inr(row.collected)}</td>
                      <td>{inr(row.payout)}</td>
                      <td>{inr(row.commission)}</td>
                      {data.type === "auction" && <td>{inr(row.dividend)}</td>}
                      <td className={balanceAfterCycle(data, cyc) < 0 ? "neg" : ""}>{inr(balanceAfterCycle(data, cyc))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === "members" && (
          <>
            <div className="toolbar">
              <select className="field" style={{ margin: 0, maxWidth: 260 }} value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
                <option value="">Add member / hand</option>
                {customers.map((c) => {
                  const hands = data.members.filter((m) => m.customerId === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}{hands ? ` · add hand (${hands} now)` : ""}
                    </option>
                  );
                })}
              </select>
              <button
                className="btn"
                disabled={!newMemberId || data.members.length >= data.membersCount}
                onClick={() => void addMember(data.id, newMemberId).then(() => {
                  const c = customers.find((x) => x.id === newMemberId);
                  if (c?.phone) {
                    openWhatsApp(
                      c.phone,
                      inviteMemberWhatsAppMessage({
                        memberName: c.name,
                        phone: c.phone,
                        chitName: data.name,
                        organiserName: user?.name,
                        instalment: data.instalment,
                      }),
                    );
                  }
                  setNewMemberId("");
                })}
              >
                {data.members.some((m) => m.customerId === newMemberId) ? copy.chit.addHand : copy.chit.addMember}
              </button>
              {contactsPickerAvailable() && (
                <button
                  className="btn ghost"
                  type="button"
                  disabled={data.members.length >= data.membersCount}
                  onClick={() => {
                    void (async () => {
                      try {
                        const rows = await pickContactsFromBook({ multiple: true });
                        for (const row of rows) {
                          if (data.members.length >= data.membersCount) break;
                          const phone = tryPhone10(row.phone);
                          if (!phone) continue;
                          let cust = customers.find((c) => c.phone === phone);
                          if (!cust) cust = await addCustomer(row.name.trim() || "Member", phone);
                          if (!data.members.some((m) => m.customerId === cust!.id) || data.members.length < data.membersCount) {
                            await addMember(data.id, cust.id);
                          }
                          openWhatsApp(
                            phone,
                            inviteMemberWhatsAppMessage({
                              memberName: cust.name,
                              phone,
                              chitName: data.name,
                              organiserName: user?.name,
                              instalment: data.instalment,
                            }),
                          );
                        }
                      } catch (e) {
                        window.alert(e instanceof Error ? e.message : "Could not open contacts");
                      }
                    })();
                  }}
                >
                  <BookUser size={15} /> From contacts
                </button>
              )}
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>
              One person can play multiple hands (slots). Each hand pays its own instalment and can win once. {data.members.length} of {data.membersCount} slots filled.
            </p>
            <div className="card flush">
              {data.members.map((m) => {
                const first = firstSlotOf(data, m.customerId);
                const handPaid = data.payments
                  .filter((p) => p.memberId === m.customerId && (p.slot != null ? p.slot === m.slot : m.slot === first))
                  .reduce((s, p) => s + p.amount, 0);
                const principal = loanPrincipalOf(data, m.customerId, m.slot);
                const received = data.auctions
                  .filter((a) => a.winnerId === m.customerId && (a.winnerSlot != null ? a.winnerSlot === m.slot : m.slot === first))
                  .reduce((s, a) => s + a.payout, 0);
                const left = Math.max(0, memberBalance(data, m.customerId, m.slot).outstanding);
                const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                const cust = customers.find((c) => c.id === m.customerId);
                return (
                  <div key={`${m.customerId}-${m.slot}`} className="list-row">
                    <div className="avatar">{initials(names[m.customerId] || "?")}</div>
                    <div className="grow">
                      <button className="link" style={{ fontWeight: 600 }} onClick={() => nav(`/customers/${m.customerId}`)}>{names[m.customerId]}</button>
                      <div className="muted">
                        Slot {m.slot}{hands > 1 ? ` · hand of ${hands}` : ""}
                        {` · paid ${inr(handPaid)}`}
                        {data.type === "auction" || handSacrifice ? ` · got ${inr(received)}` : ""}
                        {principal ? ` · loan ${inr(principal)}` : ""}
                        {m.prizedCycle ? ` · prized month ${m.prizedCycle}` : ""}
                      </div>
                    </div>
                    <div className="num">{inr(left)} left to pay</div>
                    {cust?.phone ? (
                      <MemberReachButtons
                        compact
                        phone={cust.phone}
                        whatsappText={
                          left > 0
                            ? dueReminderWhatsAppMessage({
                              memberName: cust.name,
                              chitName: data.name,
                              cycle,
                              duration: data.duration,
                              amountDue: left,
                              organiserName: user?.name,
                            })
                            : inviteMemberWhatsAppMessage({
                              memberName: cust.name,
                              phone: cust.phone,
                              chitName: data.name,
                              organiserName: user?.name,
                              instalment: data.instalment,
                            })
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "settlement" && showSettlement && (
          <div className="stack">
            <div className="stats four">
              <StatCard
                label={copy.chit.cashOnHand}
                value={<span className={cashOnHand < 0 ? "neg" : undefined}>{inr(cashOnHand)}</span>}
                hint="available now"
                tone="teal"
                icon={Wallet}
              />
              <StatCard
                label={copy.chit.loanReceived}
                value={inr(data.auctions.filter((a) => a.method === "fixed").reduce((s, a) => s + a.payout, 0))}
                hint="principal out"
                tone="blue"
                icon={PiggyBank}
              />
              <StatCard label={copy.chit.interestCollected} value={inr(interestCollected(data))} hint="earned" tone="green" icon={Percent} />
              <StatCard
                label={copy.chit.dividendsAll}
                value={inr(settlementsOf(data).reduce((s, a) => s + a.payout, 0))}
                hint="paid out"
                tone="amber"
                icon={Wallet}
              />
            </div>
            <div className="card">
              <h2>{copy.chit.settlementTitle}</h2>
              <p className="muted block">
                {copy.chit.settlementHint}
              </p>
              {(() => {
                const plan = loanSettlementPlan(data);
                const interestOut = plan.reduce((s, p) => s + p.interestPart, 0);
                const equalOut = plan.reduce((s, p) => s + p.equalPart, 0);
                return (
                  <>
                    <div className="kv"><span>Cash available</span><strong>{inr(Math.max(0, cashOnHand))}</strong></div>
                    <div className="kv"><span>Interest dividend pool</span><strong>{inr(interestOut)}</strong></div>
                    <div className="kv"><span>Equal leftover share (all)</span><strong>{inr(equalOut)}</strong></div>
                  </>
                );
              })()}
              <button
                className="btn"
                style={{ marginTop: 16 }}
                disabled={cashOnHand <= 0 || busySettle || !data.members.length}
                onClick={() => {
                  setBusySettle(true);
                  void settleBooksEqually(data.id).finally(() => setBusySettle(false));
                }}
              >
                {busySettle ? copy.chit.settling : copy.chit.settleEqual}
              </button>
              {cashOnHand > 0 && (
                <div className="table-wrap" style={{ marginTop: 16 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{copy.common.member}</th>
                        <th>{copy.chit.interestDividend}</th>
                        <th>Equal share</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanSettlementPlan(data).map((row) => (
                        <tr key={row.memberId}>
                          <td>{names[row.memberId]}</td>
                          <td>{inr(row.interestPart)}</td>
                          <td>{inr(row.equalPart)}</td>
                          <td><strong>{inr(row.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card flush">
              <div className="card-pad"><h2>Loan positions</h2></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Hand</th><th>Loan taken</th><th>{copy.chit.paidIn}</th><th>{isRunning ? "This month due" : "Outstanding"}</th></tr></thead>
                  <tbody>
                    {data.members.map((m) => {
                      const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                      const principal = loanPrincipalOf(data, m.customerId, m.slot);
                      let paid = 0;
                      for (let c = 1; c <= cycle; c++) paid += paidInCycle(data, m.customerId, c, m.slot);
                      const dueCell = isRunning
                        ? cycleDue(data, m.customerId, cycle, m.slot)
                        : Math.max(0, memberBalance(data, m.customerId, m.slot).outstanding);
                      return (
                        <tr key={`${m.customerId}-${m.slot}`}>
                          <td>{handLabel(names[m.customerId] || "Member", m.slot, hands)}</td>
                          <td>{principal ? inr(principal) : "—"}</td>
                          <td>{inr(paid)}</td>
                          <td>{inr(dueCell)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {!!settlementsOf(data).length && (
              <div className="card flush">
                <div className="card-pad"><h2>Settlement history</h2></div>
                {settlementsOf(data).map((s, i) => (
                  <div className="list-row" key={s.id || i}>
                    <div className="grow"><strong>{names[s.winnerId]}</strong><div className="muted">Cycle {s.cycle}</div></div>
                    <strong className="num">{inr(s.payout)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="stack">
            <div className="card">
              <h2>Visibility</h2>
              <label className="check"><input type="checkbox" checked={visible} onChange={(e) => {
                const next = e.target.checked;
                setVisible(next);
                void updateChitSettings(data.id, { memberVisible: next });
              }} /> Member visibility — let members see this chit’s details in the app.</label>
            </div>
            <div className="card">
              <h2>Reports</h2>
              <p className="muted block">
                Download a full ledger PDF (member ledger, month summary, charts, receipts, payouts), a month dues sheet, or raw CSV for Excel.
              </p>
              <div className="toolbar" style={{ margin: 0, flexWrap: "wrap", gap: 8 }}>
                <button className="btn" onClick={() => downloadChitReportPdf(data, names)}>Full ledger PDF</button>
                <button className="btn ghost" onClick={() => downloadMonthDuesPdf(data, names)}>Month dues PDF</button>
                <button className="btn ghost" onClick={() => downloadChitCsv(data, names)}>CSV (Excel)</button>
              </div>
            </div>
            <div className="card">
              <h2>Edit chit</h2>
              <p className="muted block">Rename this chit. Type, pot and duration stay fixed after create.</p>
              <button className="btn ghost" onClick={() => { setEditName(data.name); setEditTitle(data.title || ""); setEditOpen(true); }}>Edit name</button>
            </div>
            <div className="danger-box">
              <div className="row-head" style={{ margin: 0 }}>
                <div>
                  <strong>Cancel this chit</strong>
                  <p className="muted">Moves the chit to Cancelled. Records stay readable, but this can’t be undone.</p>
                </div>
                <button className="btn danger" onClick={() => { void cancelChit(data.id); nav("/chits"); }}>Cancel chit</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <div className="modal-back" onClick={() => setEditOpen(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!editName.trim()) return;
              setEditSaving(true);
              void updateChitSettings(data.id, { name: editName.trim(), title: editTitle.trim() })
                .finally(() => { setEditSaving(false); setEditOpen(false); });
            }}
          >
            <h2>Edit chit</h2>
            <label className="label">Name</label>
            <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="label">Title (optional)</label>
            <input className="field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn" disabled={editSaving || !editName.trim()}>{editSaving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {payFor && (
        <PayModal
          name={handLabel(
            names[payFor.customerId] || payFor.customerId,
            payFor.slot,
            data.members.filter((m) => m.customerId === payFor.customerId).length,
          )}
          cycle={cycle}
          due={cycleDue(data, payFor.customerId, cycle, payFor.slot) - paidInCycle(data, payFor.customerId, cycle, payFor.slot)}
          onClose={() => setPayFor(null)}
          onSave={(amount: number, kind: PaymentKind, mode: PayMode) => {
            const wasLastDue = remainDue <= 1;
            void recordPayment(data.id, payFor.customerId, amount, kind, mode, payFor.slot).then(() => {
              setPayFor(null);
              if (tab === "monthly" && monthSub === "collect" && wasLastDue) goAfterCollect();
            });
          }}
        />
      )}
    </AppShell>
  );
}
