import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  BookUser,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Percent,
  PiggyBank,
  Share2,
  Wallet,
  Check,
} from "lucide-react";
import { PayModal } from "../components/PayModal";
import { MemberReachButtons } from "../components/MemberReachButtons";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import { PromptBox } from "../components/PromptBox";
import { ReasonModal } from "../components/ReasonModal";
import { AppShell } from "../layout/AppShell";
import { scrollPageToTop } from "../layout/ScrollToTop";
import { buildActivityLog, formatActivityAt, groupActivityByCycle } from "../lib/activityLog";
import { StatCard, toneAt } from "../ui/StatCard";
import { useI18n } from "../i18n";
import {
  balanceAfterCycle,
  canCloseCurrentCycle,
  canCloseLastMonth,
  canGiveLoan,
  canSettleCycle,
  chitHasStarted,
  chitProgress,
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
  isAwardFirst,
  isLastAuctionCycle,
  loanDetailRows,
  loanEffectiveTenure,
  loanFaceAmount,
  loanFundingCapacity,
  loanMaxFaceAmount,
  loanMonthlyInterest,
  loanPrincipalOf,
  loanRateOf,
  loanSettlementPlan,
  loansThisCycle,
  handLabel,
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
import {
  downloadAwardReportPdf,
  downloadChitReportPdf,
  downloadLoanReportPdf,
  downloadMonthDuesPdf,
  downloadReceiptPdf,
} from "../lib/reportsPdf";
import { pickContactsFromBook } from "../lib/contacts";
import { isNativeApp } from "../lib/native";
import {
  awardWinnerWhatsAppMessage,
  canMessagePhone,
  dueReminderWhatsAppMessage,
  inviteMemberWhatsAppMessage,
  loanBorrowerWhatsAppMessage,
  loanGroupWhatsAppMessage,
  openWhatsApp,
  shareText,
  tryPhone10,
} from "../lib/share";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { AuctionRecord, PayMode, PaymentKind } from "../types";

export function ChitDetailPage() {
  const { id } = useParams();
  const {
    chits, customers, recordPayment, recordAllPayments, recordAuction, settleBooksEqually, closeCycle,
    cancelChit, addMember, removeMember, swapMember, addCustomer, undoPayment, updateChitSettings, error, user,
  } = useStore();
  const { m: copy, tx, typeLabel, freqLabel, modeLabel, statusLabel, tabLabel, locale } = useI18n();
  const nav = useNavigate();
  const chit = chits.find((c) => c.id === id);
  const [tab, setTab] = useState<"overview" | "collections" | "monthly" | "members" | "activity" | "settlement" | "settings">("overview");
  const [monthSub, setMonthSub] = useState<"collect" | "award" | "close">("collect");
  const [booksOpen, setBooksOpen] = useState(false);
  const [collectHelpOpen, setCollectHelpOpen] = useState(false);
  const [awardTouched, setAwardTouched] = useState(false);

  useEffect(() => {
    scrollPageToTop();
    const t = window.setTimeout(scrollPageToTop, 80);
    return () => window.clearTimeout(t);
  }, [tab, monthSub, id]);
  const [payFor, setPayFor] = useState<{ customerId: string; slot: number } | null>(null);
  const [bid, setBid] = useState("");
  const [loanInterest, setLoanInterest] = useState("5");
  const [winnerId, setWinnerId] = useState("");
  const [winnerSlot, setWinnerSlot] = useState<number | undefined>(undefined);
  const [newMemberId, setNewMemberId] = useState("");
  const [inlineName, setInlineName] = useState("");
  const [inlinePhone, setInlinePhone] = useState("");
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [swapToId, setSwapToId] = useState("");
  const [visible, setVisible] = useState(true);
  const [unpaidNoted, setUnpaidNoted] = useState(false);
  const [loanSkipped, setLoanSkipped] = useState(false);
  const [colRange, setColRange] = useState<"today" | "week" | "all">("all");
  const [busyAll, setBusyAll] = useState(false);
  const [busySettle, setBusySettle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [awardShare, setAwardShare] = useState<AuctionRecord | null>(null);
  const [celebrate, setCelebrate] = useState<"award" | "completed" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [membersHelpOpen, setMembersHelpOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnpaidNoted(false);
    setLoanSkipped(false);
  }, [chit?.id, chit?.currentCycle]);

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
    const af = isAwardFirst(chit);
    const dueLeft = chit.members.filter((m) => {
      const due = cycleDue(chit, m.customerId, cyc, m.slot);
      return due - paidInCycle(chit, m.customerId, cyc, m.slot) > 0;
    }).length;
    const loanOk = chit.type === "loan" && (Boolean(lw) || loanSkipped || !canGiveLoan(chit));
    if (af) {
      if (!lw && !loanOk) setMonthSub("award");
      else if (dueLeft > 0) setMonthSub("collect");
      else setMonthSub("close");
    } else if (lw || loanOk || (chit.type === "loan" && canSettleCycle(chit))) {
      setMonthSub(lw || loanSkipped ? "close" : chit.type === "loan" ? "award" : "close");
    } else if (canSettleCycle(chit)) {
      setMonthSub("award");
    } else {
      setMonthSub("collect");
    }
  }, [tab, chit?.id, chit?.currentCycle, loanSkipped]);

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
  const memberPhones = useMemo(
    () => (chit ? chit.members.map((m) => customers.find((c) => c.id === m.customerId)?.phone) : []),
    [chit, customers],
  );
  const { isOnApp } = usePhonesOnApp(memberPhones);

  if (!chit) {
    return <AppShell crumb={copy.nav.chits}><div className="page"><p>{copy.chit.notFound}</p></div></AppShell>;
  }

  if (chit.viewerRole === "member") {
    return <Navigate to={`/member/${chit.id}`} replace />;
  }

  const data = chit;
  const cycle = displayCycle(data);
  const isRunning = data.status === "running";
  const started = chitHasStarted(data);
  const pending = isRunning
    ? data.members.filter((m) => paymentStatus(data, m.customerId, cycle, m.slot) === "due").length
    : 0;
  const lastMonthGate = canCloseLastMonth(data);
  const collectCloseGate = canCloseCurrentCycle(data);
  const loanAllowed = canGiveLoan(data);
  const lastWin = data.auctions.find((a) => a.cycle === cycle && a.method !== "settlement");
  const monthLoans = loansThisCycle(data);
  const cashOnHand = treasuryOf(data);
  const loanMaxFace = data.type === "loan" ? loanMaxFaceAmount(data) : 0;
  const loanCapacity = data.type === "loan" ? loanFundingCapacity(data) : 0;
  const showSettlement = data.type === "loan";
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
  const awardFirst = isAwardFirst(data);
  /** Loan can skip giving a loan; other types need a recorded award. */
  const awardResolved =
    data.type === "loan"
      ? Boolean(lastWin) || loanSkipped || !loanAllowed
      : Boolean(lastWin);
  const shareHint = lastWin && auctionFirst
    ? auctionFirstShare(data, cycle)
    : null;

  const styleLabel = auctionFirst || (awardFirst && data.type !== "auction")
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
    ["overview", "monthly", "collections", "members", "activity", ...(showSettlement ? ["settlement" as const] : []), "settings"] as const
  );

  function scrollTabs(dir: -1 | 1) {
    tabsRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  }

  function goAfterCollect() {
    setMonthSub(awardFirst ? "close" : "award");
  }
  function goAfterAward() {
    setMonthSub(awardFirst ? "collect" : "close");
  }
  function goAfterClose() {
    setUnpaidNoted(false);
    setMonthSub(awardFirst ? "award" : "collect");
  }

  function afterAwardRecorded(rec: AuctionRecord | null | undefined) {
    if (rec) {
      setAwardShare(rec);
      setCelebrate("award");
    }
    goAfterAward();
  }

  function awardMemberLabel(rec: AuctionRecord) {
    const slot = rec.winnerSlot ?? 1;
    const hands = data.members.filter((m) => m.customerId === rec.winnerId).length;
    return handLabel(names[rec.winnerId] || "Member", slot, hands);
  }

  function awardShareCaption(rec: AuctionRecord) {
    const memberName = awardMemberLabel(rec);
    if (data.type === "loan") {
      const p = loanSharePayload(rec);
      return loanBorrowerWhatsAppMessage({
        memberName: p.memberName,
        chitName: data.name,
        cycle: rec.cycle,
        duration: data.duration,
        face: p.face,
        interestCut: p.interestCut,
        netPaid: p.netPaid,
        interestRate: p.interestRate,
        tenure: p.tenure,
        repayFrom: p.repayFrom,
        repayTo: p.repayTo,
        deposit: p.deposit,
        interestPerMonth: p.interestPerMonth,
        principalPerMonth: p.principalPerMonth,
        organiserName: user?.name,
      });
    }
    return awardWinnerWhatsAppMessage({
      memberName,
      chitName: data.name,
      cycle: rec.cycle,
      duration: data.duration,
      bid: rec.bid,
      payout: rec.payout,
      commission: rec.commission || 0,
      discount: rec.discount || 0,
      method: rec.method,
      organiserName: user?.name,
    });
  }

  function loanSharePayload(rec: AuctionRecord) {
    const face = loanFaceAmount(rec);
    const tenure = loanEffectiveTenure(data, rec.cycle);
    const slot = rec.winnerSlot ?? 1;
    const hands = data.members.filter((m) => m.customerId === rec.winnerId).length;
    const memberName = handLabel(names[rec.winnerId] || "Member", slot, hands);
    const phone = customers.find((c) => c.id === rec.winnerId)?.phone;
    const rate = loanRateOf(data, rec);
    return {
      memberName,
      phone,
      face,
      tenure,
      interestCut: Math.max(0, Number(rec.discount) || 0),
      netPaid: rec.payout,
      interestRate: rate,
      repayFrom: rec.cycle + 1,
      repayTo: rec.cycle + tenure,
      deposit: data.instalment,
      interestPerMonth: loanMonthlyInterest(data, face, rate),
      principalPerMonth: Math.ceil(face / tenure),
    };
  }

  function shareAwardPdfOnly(rec: AuctionRecord) {
    if (data.type === "loan") {
      downloadLoanReportPdf(data, rec, names, user?.name, { mode: "download" });
    } else {
      downloadAwardReportPdf(data, rec, names, user?.name, { mode: "download" });
    }
  }

  function shareAwardPdfWhatsApp(rec: AuctionRecord) {
    const caption = awardShareCaption(rec);
    const title = data.type === "loan" ? copy.chit.loanReportPdf : copy.chit.awardReportPdf;
    if (data.type === "loan") {
      downloadLoanReportPdf(data, rec, names, user?.name, {
        mode: "share",
        title,
        text: caption,
      });
    } else {
      downloadAwardReportPdf(data, rec, names, user?.name, {
        mode: "share",
        title,
        text: caption,
      });
    }
    const phone = customers.find((c) => c.id === rec.winnerId)?.phone;
    // On native the share sheet can send the PDF to WhatsApp.
    // On web, also open WhatsApp with the summary so the organiser can attach the downloaded PDF.
    if (!isNativeApp() && canMessagePhone(phone)) {
      window.setTimeout(() => openWhatsApp(phone!, caption), 400);
    }
  }

  function shareLoanPdf(rec: AuctionRecord) {
    downloadLoanReportPdf(data, rec, names, user?.name, { mode: "download" });
  }

  function shareLoanToBorrower(rec: AuctionRecord) {
    const p = loanSharePayload(rec);
    if (!canMessagePhone(p.phone)) {
      window.alert(copy.chit.borrowerNeedsPhone);
      return;
    }
    openWhatsApp(
      p.phone!,
      loanBorrowerWhatsAppMessage({
        memberName: p.memberName,
        chitName: data.name,
        cycle: rec.cycle,
        duration: data.duration,
        face: p.face,
        interestCut: p.interestCut,
        netPaid: p.netPaid,
        interestRate: p.interestRate,
        tenure: p.tenure,
        repayFrom: p.repayFrom,
        repayTo: p.repayTo,
        deposit: p.deposit,
        interestPerMonth: p.interestPerMonth,
        principalPerMonth: p.principalPerMonth,
        organiserName: user?.name,
      }),
    );
  }

  async function shareLoanToGroup(rec: AuctionRecord) {
    const p = loanSharePayload(rec);
    await shareText(
      `Loan — ${data.name}`,
      loanGroupWhatsAppMessage({
        memberName: p.memberName,
        chitName: data.name,
        cycle: rec.cycle,
        duration: data.duration,
        face: p.face,
        interestCut: p.interestCut,
        netPaid: p.netPaid,
        interestRate: p.interestRate,
        tenure: p.tenure,
        repayFrom: p.repayFrom,
        repayTo: p.repayTo,
        organiserName: user?.name,
      }),
    );
  }

  return (
    <AppShell crumb={copy.nav.chits} crumb2={data.name}>
      <div className="page chit-detail-page">
        <section className="chit-hero chit-hero-compact">
          <div className="chit-hero-top">
            <div className="chit-hero-avatar">{initials(data.name)}</div>
            <div className="chit-hero-heading">
              <h1>{data.name}</h1>
            </div>
            <span className={`chit-hero-pill ${isRunning ? "live" : ""}`}>
              {statusLabel(data.status) || data.status}
            </span>
          </div>
        </section>

        {error && <p className="due">{error}</p>}
        {!isRunning && (
          <p className="muted block">{tx(copy.chit.closedBanner, { status: statusLabel(data.status) || data.status })}</p>
        )}

        <div className="chit-tabbar">
          <button type="button" className="chit-tab-arrow" aria-label={copy.chit.scrollTabsLeft} onClick={() => scrollTabs(-1)}>
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
          <button type="button" className="chit-tab-arrow" aria-label={copy.chit.scrollTabsRight} onClick={() => scrollTabs(1)}>
            <ChevronRight size={18} />
          </button>
        </div>

        {tab === "overview" && (
          <div className="stats four">
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
          </div>
        )}

        {tab === "overview" && (
          <div className="card block chit-details-card">
            <div className="chit-details-head">
              <h2>{copy.chit.groupDetails}</h2>
              <p className="chit-details-sub">
                {[
                  typeLabel(data.type),
                  styleLabel && styleLabel !== typeLabel(data.type) ? styleLabel : "",
                  data.title || "",
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="chit-details-grid">
              <div className="chit-details-cell">
                <span>{copy.nav.customers}</span>
                <strong>{tx(copy.chit.membersOf, { count: data.members.length, total: data.membersCount })}</strong>
              </div>
              <div className="chit-details-cell">
                <span>{copy.chit.instalment}</span>
                <strong>{inr(data.instalment)}/{freqLabel(data.frequency) || data.frequency}</strong>
              </div>
              <div className="chit-details-cell">
                <span>{copy.chit.started}</span>
                <strong>{new Date(data.startDate).toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
              </div>
              <div className="chit-details-cell">
                <span>{copy.chit.ends}</span>
                <strong>{ended.toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
              </div>
              <div className="chit-details-cell">
                <span>{copy.terms.commission}</span>
                <strong>{commissionLabel}</strong>
              </div>
              <div className="chit-details-cell">
                <span>{copy.chit.month}</span>
                <strong>{cycle} / {data.duration}</strong>
              </div>
            </div>
            <div className="dash-chit-progress" style={{ marginTop: 14 }}>
              <div className="dash-chit-progress-head">
                <span>{copy.terms.collection}</span>
                <strong>{chitProgress(data)}%</strong>
              </div>
              <div className="progress"><i style={{ width: `${chitProgress(data)}%` }} /></div>
            </div>
            {(data.type === "loan" && (data.repaymentTenure || data.loanPrincipalMode || data.loanInterestUpfront != null)) && (
              <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5 }}>
                {data.repaymentTenure ? tx(copy.chit.repayMonthsShort, { n: data.repaymentTenure }) : ""}
                {data.repaymentTenure ? " · " : ""}
                {data.loanPrincipalMode === "end" ? copy.chit.principalAtEndLabel : copy.chit.principalReducingLabel}
                {" · "}
                {data.loanInterestUpfront === false ? copy.chit.interestFromNextLabel : copy.chit.interestCutAtGiveLabel}
                {" · " + copy.chit.interestPerLoanLabel}
              </p>
            )}
          </div>
        )}

        {tab === "overview" && (
          <>
            <div className="row-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>{copy.chit.booksSectionTitle}</h2>
              <button
                type="button"
                className={`info-chip${booksOpen ? " on" : ""}`}
                aria-expanded={booksOpen}
                aria-label={copy.chit.booksToggleAria}
                title={copy.chit.booksToggleAria}
                onClick={() => setBooksOpen((v) => !v)}
              >
                <Info size={15} strokeWidth={2.4} />
              </button>
            </div>
            {!booksOpen && (
              <p className="muted block" style={{ marginTop: 0 }}>
                {tx(copy.chit.booksCollapsedHint, {
                  cash: inr(treasuryOf(data)),
                  life: inr(expectedLife),
                })}
              </p>
            )}
            {booksOpen && (
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
                    ? `${inr(memberLedgerRows(data).reduce((s, r) => s + r.paid, 0))} deposits of ${inr(expectedLife)} ${copy.chit.lifetimeExpected} · ${inr(moneyIn(data))} total cash in (incl. loan repayments)`
                    : `${inr(moneyIn(data))} collected of ${inr(expectedLife)} ${copy.chit.lifetimeExpected}`}
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
                <div className="table-wrap member-ledger-wrap">
                  <table className="table member-ledger-table">
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
                        <th>{copy.chit.net}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberLedgerRows(data).map((row) => (
                        <tr key={`${row.customerId}-${row.slot}`}>
                          <td data-label={copy.common.member}>
                            <strong>
                              {handLabel(
                                names[row.customerId] || "Member",
                                row.slot,
                                data.members.filter((m) => m.customerId === row.customerId).length,
                              )}
                            </strong>
                            {row.prizedCycle ? <div className="muted">{tx(copy.chit.prizedMonth, { n: row.prizedCycle })}</div> : null}
                          </td>
                          <td data-label={copy.chit.paidIn}>{inr(row.paid)}</td>
                          {data.type === "loan" ? (
                            <>
                              <td data-label={copy.chit.loanReceived}>{inr(row.loanOut || 0)}</td>
                              <td data-label={copy.chit.interestPaid}>{inr(row.interestPaid || 0)}</td>
                              <td data-label={copy.chit.interestDividend}>{inr(row.dividend)}</td>
                            </>
                          ) : (
                            <>
                              <td data-label={copy.chit.gotFromPot}>{inr(row.received - (handSacrifice ? row.dividend : 0))}</td>
                              <td data-label={handSacrifice ? copy.chit.cashDividends : copy.chit.dividends}>{inr(row.dividend)}</td>
                            </>
                          )}
                          <td data-label={copy.chit.net} className={row.net < 0 ? "neg" : ""}>{inr(row.net)}</td>
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
                        <th>{copy.chit.interest}</th>
                        <th>{copy.chit.interestCut}</th>
                        <th>{copy.chit.netPaidOut}</th>
                        <th>{copy.chit.repay}</th>
                        <th>{copy.chit.sharePerMo}</th>
                        <th>{copy.common.share}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanDetailRows(data).map((row, i) => {
                        const auction =
                          data.auctions.find(
                            (a) =>
                              a.method === "fixed"
                              && a.cycle === row.cycle
                              && a.winnerId === row.memberId
                              && (row.slot == null || a.winnerSlot == null || a.winnerSlot === row.slot),
                          ) || null;
                        return (
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
                            <td>{row.interestRate}%</td>
                            <td>{inr(row.upfrontInterest)}</td>
                            <td>{inr(row.netPaidOut)}{row.commission ? <div className="muted">comm {inr(row.commission)}</div> : null}</td>
                            <td>
                              {row.tenure} mo
                              <div className="muted">M{row.repayFrom}–M{row.repayTo}</div>
                            </td>
                            <td>
                              {row.principalAtEnd ? (
                                <>
                                  {inr(row.face)} at end
                                  <div className="muted">+ {inr(row.interestPerMonth)} int/mo</div>
                                </>
                              ) : (
                                <>
                                  {inr(row.principalSharePerMonth)}
                                  <div className="muted">+ {inr(row.interestPerMonth)} int/mo</div>
                                </>
                              )}
                            </td>
                            <td>
                              {auction ? (
                                <div className="loan-share-row compact">
                                  <button type="button" className="btn ghost btn-sm" title={copy.chit.loanReportPdf} onClick={() => shareLoanPdf(auction)}>
                                    PDF
                                  </button>
                                  <button type="button" className="btn ghost btn-sm" title={copy.chit.whatsappBorrower} onClick={() => shareLoanToBorrower(auction)}>WA
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
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
                    {tx(copy.chit.commissionOfWhich, { amount: inr(commissionEarned(data)) })}
                  </p>
                </>
              )}
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="kv"><span>{copy.detail.type}</span><strong>{typeLabel(data.type).toUpperCase()}</strong></div>
                <div className="kv"><span>{copy.detail.frequency}</span><strong>{freqLabel(data.frequency)}</strong></div>
                <div className="kv"><span>{copy.chit.contribution}</span><strong>{inr(data.instalment)}</strong></div>
                <div className="kv"><span>{copy.chit.durationLabel}</span><strong>{tx(copy.chit.durationMonths, { n: data.duration })}</strong></div>
                {data.type === "loan" && (
                  <>
                    <div className="kv"><span>{copy.chit.interest}</span><strong>{copy.chit.interestSetPerLoan}</strong></div>
                    <div className="kv"><span>{copy.chit.repaymentTenure}</span><strong>{data.repaymentTenure ? tx(copy.chit.durationMonths, { n: data.repaymentTenure }) : copy.chit.restOfChit}</strong></div>
                  </>
                )}
                {fixedLike && data.premiumAmount != null && data.premiumAmount > 0 && (
                  <div className="kv"><span>{copy.chit.premiumLegacy}</span><strong>{inr(data.premiumAmount)}</strong></div>
                )}
                <div className="kv"><span>{copy.chit.commissionPerHapta}</span><strong>{
                  data.commissionKind === "amount" && data.commissionValue
                    ? inr(data.commissionValue)
                    : `${data.commissionPct}%`
                }</strong></div>
              </div>
            </div>
            <div className="card flush block">
              <div className="card-pad"><h2 style={{ margin: 0, fontSize: 15 }}>{copy.chit.monthlyBreakdown}</h2></div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{copy.chit.cycle}</th>
                      <th>{copy.chit.collected}</th>
                      <th>{data.type === "loan" ? copy.chit.loanGiven : copy.chit.payout}</th>
                      <th>{copy.chit.commission}</th>
                      {data.type === "auction" && <th>{copy.chit.dividendGenerated}</th>}
                      <th>{copy.chit.balance}</th>
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
              </>
            )}
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
              const awardLabel = awardFirst
                ? copy.chit.award
                : data.type === "loan"
                  ? (loanAllowed ? copy.chit.award : copy.chit.closeStep)
                  : luckyDrawChit
                    ? copy.type.lucky_draw
                    : fixedLike
                      ? copy.chit.award
                      : copy.chit.award;
              const subs = awardFirst
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
              const awardDone = awardResolved;
              const collectDone = awardFirst
                ? awardResolved && remainDue === 0
                : remainDue === 0;
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
            <div className="stats two">
              <StatCard label={copy.chit.expectedThisHapta} value={inr(expectedThisCycle(data))} hint="target" tone="blue" icon={Wallet} />
              <StatCard label={copy.terms.collected} value={inr(collectedThisCycle(data))} hint="received" tone="green" icon={PiggyBank} />
            </div>
            <div className="card flush member-list-card">
              <div className="card-pad month-head">
                <div className="member-list-head" style={{ padding: 0 }}>
                  {tx(copy.chit.haptaCollectMeta, {
                    n: cycle,
                    status: isRunning ? copy.chit.open : copy.chit.closed,
                    done: collectedCount(data),
                    total: data.members.length,
                  })}
                </div>
                <div className="seg">
                  <button
                    className="btn"
                    disabled={!isRunning || !remainDue || busyAll || (awardFirst && !awardResolved)}
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
                  <button className="btn ghost" type="button" disabled={!isRunning || !remainDue || (awardFirst && !awardResolved)} onClick={() => {
                    setUnpaidNoted(true);
                    goAfterCollect();
                  }}>
                    {copy.chit.markAllUnpaid}
                  </button>
                </div>
              </div>
              {awardFirst && !awardResolved && (
                <PromptBox tone="amber" className="inline">
                  {auctionFirst
                    ? copy.chit.collectPromptAuctionFirst
                    : data.type === "loan"
                      ? copy.chit.collectPromptLoan
                      : copy.chit.collectPromptAward}
                </PromptBox>
              )}
              <div className="row-head" style={{ margin: "8px 14px" }}>
                <span className="muted" style={{ fontSize: 13 }}>{copy.chit.collectRulesLabel}</span>
                <button
                  type="button"
                  className={`info-chip${collectHelpOpen ? " on" : ""}`}
                  aria-expanded={collectHelpOpen}
                  aria-label={copy.chit.collectRulesAria}
                  title={copy.chit.collectRulesAria}
                  onClick={() => setCollectHelpOpen((v) => !v)}
                >
                  <Info size={15} strokeWidth={2.4} />
                </button>
              </div>
              {collectHelpOpen && (
                <div className="stack" style={{ gap: 8, margin: "0 14px 8px" }}>
                  {auctionFirst && lastWin && shareHint != null && (
                    <PromptBox tone="blue" className="inline">
                      {tx(copy.chit.collectPromptShare, { bid: inr(lastWin.bid), n: data.members.length, share: inr(shareHint), pot: inr(data.pot) })}
                    </PromptBox>
                  )}
                  {!awardFirst && !canSettleCycle(data) && !lastWin && (
                    <PromptBox tone="amber" className="inline">
                      {copy.chit.collectPromptCollectFirstFull}
                    </PromptBox>
                  )}
                  {!awardFirst && lastWin && (
                    <PromptBox tone="teal" className="inline">
                      {copy.chit.collectPromptDividend}
                    </PromptBox>
                  )}
                  {unpaidNoted && remainDue > 0 && (
                    <PromptBox tone="rose" className="inline">
                      {tx(copy.chit.collectPromptUnpaid, { suffix: awardFirst ? copy.chit.collectUnpaidSuffixAward : copy.chit.collectUnpaidSuffixCollect })}
                    </PromptBox>
                  )}
                  {!auctionFirst && !lastWin && awardFirst === false && canSettleCycle(data) && (
                    <PromptBox tone="blue" className="inline">{copy.chit.collectPromptCollectFirstFull}</PromptBox>
                  )}
                </div>
              )}
              {!collectHelpOpen && unpaidNoted && remainDue > 0 && (
                <div style={{ margin: "0 14px 8px" }}>
                  <PromptBox tone="rose" className="inline">
                    {tx(copy.chit.collectPromptUnpaid, { suffix: awardFirst ? copy.chit.collectUnpaidSuffixAward : copy.chit.collectUnpaidSuffixCollect })}
                  </PromptBox>
                </div>
              )}
              {!awardFirst || awardResolved ? (
              <div className="hapta-collect-list">
                {data.members
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((m, i) => {
                    const due = cycleDue(data, m.customerId, cycle, m.slot);
                    const paid = paidInCycle(data, m.customerId, cycle, m.slot);
                    const status = paymentStatus(data, m.customerId, cycle, m.slot);
                    const left = Math.max(0, due - paid);
                    const fullyPaid = status === "paid" || status === "advance" || (due > 0 && paid >= due);
                    const isWinner = lastWin?.winnerId === m.customerId
                      && (lastWin.winnerSlot == null || lastWin.winnerSlot === m.slot);
                    const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                    const cust = customers.find((c) => c.id === m.customerId);
                    const canRecord = isRunning && !(awardFirst && !awardResolved) && (status === "due" || status === "partial");
                    return (
                      <div
                        key={`${m.customerId}-${m.slot}`}
                        className={`hapta-collect-row${canRecord ? " due" : ""}${fullyPaid ? " paid" : ""}`}
                      >
                        <div className={`avatar tone-${toneAt(i)}`}>{initials(names[m.customerId] || "?")}</div>
                        <div className="grow">
                          <button
                            type="button"
                            className="member-list-name"
                            onClick={() => nav(`/customers/${m.customerId}`)}
                          >
                            {handLabel(names[m.customerId] || copy.common.member, m.slot, hands)}
                            {isWinner ? <span className="muted">{copy.chit.winnerSuffix}</span> : null}
                          </button>
                          <div className="muted member-list-meta">
                            {fullyPaid
                              ? copy.chit.paidForMonth
                              : tx(copy.chit.balanceLeft, { amount: inr(left || due) })}
                          </div>
                        </div>
                        {fullyPaid ? (
                          <div className="hapta-paid-actions">
                            <div className="hapta-paid-badge" aria-label={copy.chit.paidForMonth}>
                              <span className="hapta-paid-amount">{inr(paid || due)}</span>
                              <span className="hapta-paid-tick"><Check size={16} strokeWidth={2.6} /></span>
                            </div>
                            {isRunning ? (
                              <button
                                type="button"
                                className="hapta-undo-link"
                                onClick={() => {
                                  const last = [...data.payments].reverse().find(
                                    (p) => p.memberId === m.customerId && p.cycle === cycle && (p.slot == null || p.slot === m.slot),
                                  );
                                  if (last?.id) void undoPayment(data.id, last.id);
                                }}
                              >
                                {copy.chit.undo}
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="hapta-collect-actions">
                            {canRecord ? (
                              <button
                                type="button"
                                className="btn btn-sm hapta-record-btn"
                                onClick={() => setPayFor({ customerId: m.customerId, slot: m.slot })}
                              >
                                {copy.chit.record}
                              </button>
                            ) : null}
                            {cust?.phone && left > 0 ? (
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
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              ) : (
                <p className="muted" style={{ padding: "0 16px 16px" }}>{copy.chit.duesAfterAuction}</p>
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
                      ? (!isRunning || !loanAllowed ? copy.chit.monthClose : copy.chit.thisMonthsLoan)
                      : fixedLike
                        ? copy.chit.thisMonthsPayout
                        : copy.chit.thisMonthsAuction}
                  </h2>
                  <p className="muted">
                    {data.type === "loan"
                      ? !isRunning
                        ? copy.chit.awardClosed
                        : !loanAllowed
                          ? copy.chit.awardLastMonth
                          : copy.chit.awardOptionalLoan
                      : fixedLike
                        ? luckyDrawChit
                          ? unprized.length
                            ? tx(copy.chit.rollAmong, { n: unprized.length })
                            : copy.chit.awardAllPrized
                          : handSacrifice
                            ? unprized.length <= 1
                              ? copy.chit.awardLastMemberFull
                              : nextSlot
                                ? tx(copy.chit.nextBySlotSacrifice, {
                                    name: names[nextSlot.customerId],
                                    payout: inr(data.pot - handSacrificeAmount(data)),
                                    div: inr(handSacrificeAmount(data)),
                                    n: unprized.length - 1,
                                  })
                                : copy.chit.awardAllSlots
                            : nextSlot
                              ? tx(copy.chit.nextBySlotOrder, {
                                  name: names[nextSlot.customerId],
                                  slot: nextSlot.slot,
                                })
                              : copy.chit.awardAllSlots
                        : auctionFirst
                          ? copy.chit.awardAuctionFirstHint
                          : copy.chit.awardCollectFirstHint}
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
                        ? copy.chit.luckyDrawWinner
                        : fixedLike
                          ? copy.chit.awardedTo
                          : copy.chit.winnerAuction}
                    </span>
                    <strong>{names[lastWin.winnerId]}</strong>
                  </div>
                  <div className="kv"><span>{copy.chit.payout}</span><strong>{inr(lastWin.payout)}</strong></div>
                  <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(lastWin.commission)}</strong></div>
                  {lastWin.dividend > 0 && (
                    <div className="kv"><span>{copy.chit.dividendNextMonth}</span><strong>{inr(lastWin.dividend)}</strong></div>
                  )}
                  {lastWin.method === "lucky_draw" && (
                    <button
                      className="btn ghost"
                      type="button"
                      style={{ marginTop: 12 }}
                      onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                    >
                      {copy.chit.viewWheelShare}
                    </button>
                  )}
                  <p className="muted" style={{ marginTop: 12 }}>{copy.chit.alreadyRecordedClose}</p>
                </div>
              ) : !awardFirst && !canSettleCycle(data) ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  {copy.chit.collectPromptCollectFirstFull}
                </p>
              ) : (
                <div style={{ padding: "16px 0 0" }}>
                  {data.type === "auction" && (
                    <>
                      {lastAuctionMonth ? (
                        <>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            {auctionFirst
                              ? tx(copy.chit.lastCycleAuctionFirst, {
                                  pot: inr(data.pot),
                                  share: inr(computeInstalment(data.pot, data.members.length || 1)),
                                })
                              : tx(copy.chit.lastCycleCollectFirst, { cash: inr(cashOnHand) })}
                          </p>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select
                              className="field"
                              value={handSelectValue || (lastMember ? `${lastMember.customerId}::${lastMember.slot}` : "")}
                              onChange={(e) => pickHand(e.target.value)}
                            >
                              <option value="">{copy.chit.lastMember}</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
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
                                  .then((rec) => afterAwardRecorded(rec));
                              }}
                            >
                              {copy.chit.awardFullPot}
                            </button>
                          </div>
                          {(winnerId || lastMember) && (() => {
                            const who = winnerId || lastMember!.customerId;
                            const slot = winnerSlot ?? lastMember?.slot;
                            const preview = settleWinner(data, who, auctionFirst ? data.pot : cashOnHand, "auction", slot);
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>{copy.chit.winnerTakes}</span><strong>{inr(preview.bid)}</strong></div>
                                {preview.arrearsWithheld > 0 && (
                                  <>
                                    <div className="kv"><span>{copy.chit.arrearsWithheld}</span><strong>{inr(preview.arrearsWithheld)}</strong></div>
                                    <div className="kv"><span>{copy.chit.netToWinner}</span><strong>{inr(preview.payout)}</strong></div>
                                  </>
                                )}
                                <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(preview.commission)}</strong></div>
                                {auctionFirst ? (
                                  <div className="kv"><span>{copy.chit.eachMemberPays}</span><strong>{inr(auctionFirstShare({ ...data, auctions: [...data.auctions, preview] }, cycle))}</strong></div>
                                ) : (
                                  <div className="kv"><span>{copy.chit.cashOnHandAfter}</span><strong>{inr(cashOnHand - preview.payout - preview.commission)}</strong></div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select
                              className="field"
                              value={handSelectValue}
                              onChange={(e) => {
                                setAwardTouched(true);
                                pickHand(e.target.value);
                              }}
                            >
                              <option value="">{copy.luckyDraw.winner}</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
                                </option>
                              ))}
                            </select>
                            <input
                              className="field"
                              placeholder={copy.chit.winningBidPlaceholder}
                              value={bid}
                              onChange={(e) => {
                                setAwardTouched(true);
                                setBid(e.target.value);
                              }}
                            />
                            <button
                              className="btn"
                              disabled={!winnerId || !bid || !Number(bid)}
                              onClick={() => void recordAuction(data.id, winnerId, Number(bid), "auction", winnerSlot).then((rec) => afterAwardRecorded(rec))}
                            >
                              {copy.chit.recordAuctionBtn}
                            </button>
                          </div>
                          {awardTouched && (!winnerId || !bid || !Number(bid)) && (
                            <p className="due" style={{ marginTop: 8 }}>
                              {!winnerId
                                ? copy.chit.awardNeedWinner
                                : copy.chit.awardNeedBid}
                            </p>
                          )}
                          {winnerId && Number(bid) > 0 && (() => {
                            const preview = settleWinner(data, winnerId, Number(bid), "auction", winnerSlot);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            const entered = Number(bid);
                            const awardFace = preview.bid;
                            const nextShare = auctionFirst
                              ? auctionFirstShare({ ...data, auctions: [...data.auctions.filter((a) => a.cycle !== cycle), preview] }, cycle)
                              : null;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>{copy.chit.winnerTakes}</span><strong>{inr(awardFace)}</strong></div>
                                {entered > 0 && awardFace !== entered && (
                                  <p className="muted" style={{ margin: "4px 0 0" }}>
                                    {tx(copy.chit.awardClampedHint, { entered: inr(entered), award: inr(awardFace) })}
                                  </p>
                                )}
                                {preview.arrearsWithheld > 0 && (
                                  <>
                                    <div className="kv"><span>{copy.chit.arrearsWithheld}</span><strong>{inr(preview.arrearsWithheld)}</strong></div>
                                    <div className="kv"><span>{copy.chit.netToWinner}</span><strong>{inr(preview.payout)}</strong></div>
                                  </>
                                )}
                                <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(preview.commission)}</strong></div>
                                {auctionFirst ? (
                                  <div className="kv"><span>{copy.chit.eachMemberPays}</span><strong>{inr(nextShare || 0)}</strong></div>
                                ) : (
                                  <>
                                    <div className="kv"><span>{copy.chit.discountKasr}</span><strong>{inr(preview.discount)}</strong></div>
                                    <div className="kv"><span>{copy.chit.dividendNextMonth}</span><strong>{inr(preview.dividend)}</strong></div>
                                    <div className="kv"><span>{copy.chit.cashOnHandAfter}</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                          {/* Lucky draw belongs on lucky-draw / sacrifice types — not auction */}
                        </>
                      )}
                    </>
                  )}
                  {data.type === "loan" && (
                    <>
                      {!!monthLoans.length && (
                        <div className="card" style={{ marginBottom: 12, background: "#f8fafc" }}>
                          <strong>{copy.chit.loansThisMonth}</strong>
                          {monthLoans.map((l, i) => (
                            <div key={l.id || `${l.winnerId}-${l.winnerSlot}-${i}`} style={{ marginTop: 10 }}>
                              <div className="kv">
                                <span>
                                  {names[l.winnerId]}
                                  {l.winnerSlot != null ? ` · ${tx(copy.chit.slot, { n: l.winnerSlot })}` : ""}
                                </span>
                                <strong>{inr(l.payout)}{l.commission ? tx(copy.chit.commissionAmount, { amount: inr(l.commission) }) : ""}</strong>
                              </div>
                              <div className="loan-share-row">
                                <button type="button" className="btn ghost btn-sm" onClick={() => shareLoanPdf(l)}>
                                  {copy.chit.loanPdfShort}
                                </button>
                                <button type="button" className="btn ghost btn-sm" onClick={() => shareLoanToBorrower(l)}>
                                  {copy.chit.whatsappBorrower}
                                </button>
                                <button type="button" className="btn ghost btn-sm" onClick={() => void shareLoanToGroup(l)}>
                                  {copy.chit.shareToGroup}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="kv"><span>{copy.chit.totalLoaned}</span><strong>{inr(monthLoans.reduce((s, l) => s + l.payout, 0))}</strong></div>
                          <div className="kv"><span>{copy.chit.cashStillOnHand}</span><strong>{inr(cashOnHand)}</strong></div>
                        </div>
                      )}
                      {!loanAllowed ? (
                        <p className="muted" style={{ marginBottom: 10 }}>
                          {copy.chit.lastMonthNoLoansDetail}
                        </p>
                      ) : (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {tx(copy.chit.pickBorrowingHand, {
                              max: inr(loanMaxFace),
                              cash: inr(Math.max(0, cashOnHand)),
                              expected: inr(Math.max(0, loanCapacity - Math.max(0, cashOnHand))),
                            })}
                          </p>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">{copy.chit.borrowerHand}</option>
                              {data.members.map((m) => {
                                const hands = data.members.filter((x) => x.customerId === m.customerId).length;
                                const borrowed = loanPrincipalOf(data, m.customerId, m.slot);
                                return (
                                  <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                    {handLabel(names[m.customerId] || copy.common.member, m.slot, hands)}
                                    {borrowed ? tx(copy.chit.alreadyBorrowed, { amount: inr(borrowed) }) : ""}
                                  </option>
                                );
                              })}
                            </select>
                            <label className="label" style={{ marginTop: 8 }}>{copy.chit.interest}</label>
                            <input
                              className="field"
                              inputMode="decimal"
                              value={loanInterest}
                              onChange={(e) => setLoanInterest(e.target.value.replace(/[^\d.]/g, ""))}
                              placeholder={copy.chit.interestEg}
                            />
                            <div className="quick" style={{ marginBottom: 8 }}>
                              {[2, 3, 4, 5, 6, 8, 10].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className={`chip ${loanInterest === String(v) ? "on" : ""}`}
                                  onClick={() => setLoanInterest(String(v))}
                                >
                                  {v}%
                                </button>
                              ))}
                            </div>
                            <input
                              className="field"
                              inputMode="numeric"
                              placeholder={copy.chit.loanAmount}
                              value={bid}
                              onChange={(e) => setBid(e.target.value.replace(/[^\d]/g, ""))}
                            />
                            <button
                              className="btn"
                              disabled={
                                !winnerId
                                || winnerSlot == null
                                || !Number(bid)
                                || Number(bid) > loanMaxFace
                                || loanMaxFace <= 0
                                || loanInterest === ""
                                || !Number.isFinite(Number(loanInterest))
                              }
                              onClick={() => {
                                const amount = Number(bid);
                                const rate = Number(loanInterest);
                                void recordAuction(data.id, winnerId, amount, "fixed", winnerSlot, rate).then((rec) => {
                                  setBid(String(Math.min(data.pot, loanMaxFace)));
                                  setWinnerId("");
                                  setWinnerSlot(undefined);
                                  setLoanSkipped(false);
                                  afterAwardRecorded(rec);
                                });
                              }}
                            >
                              {copy.chit.giveLoan}
                            </button>
                          </div>
                          <div className="quick" style={{ marginTop: 8 }}>
                            {[data.pot, data.pot * 2, data.pot * 3, loanMaxFace]
                              .filter((v, i, arr) => v > 0 && v <= loanMaxFace && arr.indexOf(v) === i)
                              .map((v) => (
                              <button key={v} type="button" className={`chip ${bid === String(v) ? "on" : ""}`} onClick={() => setBid(String(v))}>
                                {inr(v)}{v === loanMaxFace ? copy.chit.maxSuffix : ""}
                              </button>
                            ))}
                          </div>
                          {Number(bid) > loanMaxFace && (
                            <p className="due" style={{ marginTop: 8 }}>
                              {tx(copy.chit.loanCannotExceed, { max: inr(loanMaxFace) })}
                            </p>
                          )}
                          {winnerId && winnerSlot != null && Number(bid) > 0 && (() => {
                            const faceReq = Number(bid);
                            const rate = Number(loanInterest) || 0;
                            const preview = settleWinner(data, winnerId, faceReq, "fixed", winnerSlot, rate);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            const start = cycle;
                            const tenure = loanEffectiveTenure(data, start);
                            const face = preview.bid;
                            const share = (data.loanPrincipalMode || "emi") === "end"
                              ? face
                              : Math.ceil(face / tenure);
                            const interest = loanMonthlyInterest(data, face, rate);
                            const balloon = (data.loanPrincipalMode || "emi") === "end";
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>{copy.chit.hand}</span><strong>{tx(copy.chit.slot, { n: winnerSlot })}</strong></div>
                                <div className="kv"><span>{copy.chit.faceLoan}</span><strong>{inr(face)}{faceReq > face ? ` ${tx(copy.chit.cappedFrom, { amount: inr(faceReq) })}` : ""}</strong></div>
                                <div className="kv"><span>{copy.chit.interest}</span><strong>{tx(copy.chit.interestPctMonth, { rate })}</strong></div>
                                <div className="kv">
                                  <span>{preview.discount > 0 ? copy.chit.interestCutNow : copy.chit.interestCutAtGiveLabel}</span>
                                  <strong>{inr(preview.discount)}{preview.discount === 0 ? ` ${copy.chit.noneFromNextMonth}` : ""}</strong>
                                </div>
                                <div className="kv"><span>{copy.chit.borrowerReceives}</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>{copy.chit.repaymentMonths}</span><strong>{tenure} {tx(copy.chit.remainingOfChit, { n: Math.max(0, data.duration - start) })}</strong></div>
                                <div className="kv"><span>{copy.chit.fromNextMonthDeposit}</span><strong>{inr(data.instalment)}</strong></div>
                                <div className="kv">
                                  <span>{balloon ? copy.chit.interestMonth : copy.chit.interestReducing}</span>
                                  <strong>{inr(interest)} ({rate}%{balloon ? copy.chit.ofFace : copy.chit.ofOutstanding})</strong>
                                </div>
                                <div className="kv">
                                  <span>{balloon ? copy.chit.principalLastMonth : copy.chit.principalShareMonth}</span>
                                  <strong>
                                    {inr(share)}
                                    {balloon ? copy.chit.atEnd : tx(copy.chit.overMonths, { n: tenure })}
                                  </strong>
                                </div>
                                <div className="kv"><span>{copy.chit.cashOnHandAfter}</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                                {cashAfter < 0 && (
                                  <p className="muted" style={{ margin: "6px 0 0" }}>
                                    {tx(copy.chit.temporarilyBelowZero, {
                                      amount: inr(Math.max(0, loanCapacity - Math.max(0, cashOnHand))),
                                    })}
                                  </p>
                                )}
                                {faceReq > loanMaxFace && <p className="due">{copy.chit.loanFundingShort}</p>}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            className="btn ghost wide"
                            style={{ marginTop: 12 }}
                            onClick={() => {
                              setLoanSkipped(true);
                              setAwardShare(null);
                              goAfterAward();
                            }}
                          >
                            {copy.chit.skipLoan}
                          </button>
                          <p className="muted" style={{ marginTop: 8 }}>{copy.chit.skipLoanHint}</p>
                        </>
                      )}
                    </>
                  )}
                  {data.type === "loan" && loanSkipped && !monthLoans.length && (
                    <div className="card" style={{ marginTop: 12, background: "#f0fdf4" }}>
                      <strong>{copy.chit.skipLoan}</strong>
                      <p className="muted" style={{ margin: "6px 0 0" }}>{copy.chit.skipLoanHint}</p>
                      <button
                        type="button"
                        className="btn ghost btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => setLoanSkipped(false)}
                      >
                        {copy.common.back}
                      </button>
                    </div>
                  )}
                  {fixedLike && !lastWin && (
                    <>
                      {luckyDrawChit ? (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {unprized.length <= 1
                              ? copy.chit.awardLdLast
                              : awardFirst
                                ? copy.chit.awardLdFirst
                                : copy.chit.awardLdCollect}
                          </p>
                          {unprized.length <= 1 ? (
                            <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                              <select className="field" value={handSelectValue || (unprized[0] ? `${unprized[0].customerId}::${unprized[0].slot}` : "")} onChange={(e) => pickHand(e.target.value)}>
                                <option value="">{copy.chit.awardLastPotTo}</option>
                                {unprized.map((m) => (
                                  <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                    {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn"
                                disabled={!canSettleCycle(data) || !(winnerId || unprized[0])}
                                onClick={() => {
                                  const who = winnerId || unprized[0]?.customerId || "";
                                  const slot = winnerSlot ?? unprized[0]?.slot;
                                  void recordAuction(data.id, who, data.pot, "lucky_draw", slot).then((rec) => afterAwardRecorded(rec));
                                }}
                              >
                                {copy.chit.awardLastPot}
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr" }}>
                                <button
                                  className="btn"
                                  disabled={!canSettleCycle(data) || unprized.length === 0}
                                  onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                                >
                                  {tx(copy.chit.rollLuckyDraw, { n: unprized.length })}
                                </button>
                              </div>
                              <div className="month-auction" style={{ padding: 0, marginTop: 10, gridTemplateColumns: "1fr auto" }}>
                                <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                                  <option value="">{copy.chit.orPickWinner}</option>
                                  {unprized.map((m) => (
                                    <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                      {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn ghost"
                                  disabled={!canSettleCycle(data) || !winnerId}
                                  onClick={() => void recordAuction(data.id, winnerId, data.pot, "lucky_draw", winnerSlot).then((rec) => afterAwardRecorded(rec))}
                                >
                                  {copy.chit.awardPot}
                                </button>
                              </div>
                              {unprized.length > 0 && (
                                <p className="muted" style={{ marginTop: 10 }}>
                                  {tx(copy.chit.inThePot, { names: unprized.map((m) => names[m.customerId]).join(", ") })}
                                </p>
                              )}
                            </>
                          )}
                        </>
                      ) : handSacrifice ? (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {awardFirst
                              ? tx(copy.chit.handSacrificeFirst, { amount: inr(handSacrificeAmount(data)) })
                              : tx(copy.chit.handSacrificeCollect, { amount: inr(handSacrificeAmount(data)) })}
                          </p>
                          <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">{copy.chit.awardPotTo}</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
                                  {nextSlot?.customerId === m.customerId && nextSlot.slot === m.slot ? copy.chit.nextHandSuffix : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!winnerId || !canSettleCycle(data)}
                              onClick={() => void recordAuction(data.id, winnerId, data.pot, "fixed", winnerSlot).then((rec) => afterAwardRecorded(rec))}
                            >
                              {copy.chit.awardPot}
                            </button>
                          </div>
                          <button
                            className="btn ghost"
                            style={{ marginTop: 10 }}
                            disabled={!canSettleCycle(data) || unprized.length === 0}
                            onClick={() => nav(`/chits/${data.id}/lucky-draw`)}
                          >
                            {tx(copy.chit.luckyDrawInstead, { n: unprized.length })}
                          </button>
                          {winnerId && (() => {
                            const preview = settleWinner(data, winnerId, data.pot, "fixed", winnerSlot);
                            const still = Math.max(0, unprized.length - 1);
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>{copy.chit.winnerTakes}</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>{copy.chit.dividendPool}</span><strong>{inr(preview.discount)}</strong></div>
                                {still > 0 && preview.discount > 0 ? (
                                  <div className="kv"><span>{tx(copy.chit.eachOfStillPlaying, { n: still })}</span><strong>{inr(preview.dividend)}</strong></div>
                                ) : (
                                  <p className="muted" style={{ marginTop: 8 }}>{copy.chit.lastMemberNoDividends}</p>
                                )}
                                <div className="kv"><span>{copy.chit.cashOnHandAfter}</span><strong>{inr(cashOnHand - preview.payout - preview.commission - preview.discount)}</strong></div>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <p className="muted" style={{ marginBottom: 10 }}>
                            {awardFirst
                              ? copy.chit.awardFixedFirst
                              : copy.chit.awardFixedCollect}
                          </p>
                          <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                            <select className="field" value={handSelectValue} onChange={(e) => pickHand(e.target.value)}>
                              <option value="">{copy.chit.awardPotTo}</option>
                              {unprized.map((m) => (
                                <option key={`${m.customerId}-${m.slot}`} value={`${m.customerId}::${m.slot}`}>
                                  {tx(copy.chit.slotDotName, { n: m.slot, name: names[m.customerId] })}
                                  {nextSlot?.customerId === m.customerId && nextSlot.slot === m.slot ? copy.chit.nextHandSuffix : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!winnerId || !canSettleCycle(data)}
                              onClick={() => void recordAuction(data.id, winnerId, data.pot, "fixed", winnerSlot).then((rec) => afterAwardRecorded(rec))}
                            >
                              {copy.chit.awardPot}
                            </button>
                          </div>
                          {winnerId && (() => {
                            const preview = settleWinner(data, winnerId, data.pot, "fixed", winnerSlot);
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>{copy.chit.memberReceives}</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>{copy.chit.yourCommission}</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>{copy.chit.cashOnHandAfter}</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
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
                      ? copy.chit.closeAfterAuction
                      : data.type === "loan"
                        ? !loanAllowed
                          ? copy.chit.closeLastSettle
                          : copy.chit.closeLoan
                        : copy.chit.closeDefault}
                  </p>
                </div>
                <button
                  className="btn green"
                  disabled={
                    !isRunning
                      ? true
                      : !collectCloseGate.ok
                        ? true
                      : !lastMonthGate.ok
                        ? true
                      : data.mode === "organise" && data.type === "auction" && !lastWin
                        ? true
                        : data.mode === "organise" && fixedLike && !lastWin
                          ? true
                          : false
                  }
                  onClick={() => {
                    const finishing = cycle >= data.duration;
                    void closeCycle(data.id).then(() => {
                      goAfterClose();
                      if (finishing) setCelebrate("completed");
                    });
                  }}
                >
                  Close month
                </button>
              </div>
              {!isRunning ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  {tx(copy.chit.closedBanner, { status: statusLabel(data.status) || data.status })}
                </p>
              ) : !collectCloseGate.ok ? (
                <p className="due" style={{ margin: "12px 0 0" }}>{collectCloseGate.reason}</p>
              ) : !lastMonthGate.ok ? (
                <p className="due" style={{ margin: "12px 0 0" }}>{lastMonthGate.reason}</p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div className="kv"><span>{copy.chit.collectedThisMonth}</span><strong>{inr(collectedThisCycle(data))}</strong></div>
                  <div className="kv"><span>{copy.chit.outstandingLabel}</span><strong>{inr(outstandingOf(data))}</strong></div>
                  <div className="kv">
                    <span>{auctionFirst ? copy.chit.tillPeerShort : copy.chit.cashOnHand}</span>
                    <strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong>
                  </div>
                  {lastWin && data.type !== "loan" && (
                    <>
                      <div className="kv"><span>{copy.chit.awardedTo}</span><strong>{names[lastWin.winnerId]}</strong></div>
                      <div className="kv"><span>{copy.chit.payout}</span><strong>{inr(lastWin.payout)}</strong></div>
                      <div className="kv"><span>{copy.terms.commission}</span><strong>{inr(lastWin.commission)}</strong></div>
                    </>
                  )}
                  {data.type === "loan" && !!monthLoans.length && (
                    <div className="kv">
                      <span>{copy.chit.loansThisMonth}</span>
                      <strong>{inr(monthLoans.reduce((s, l) => s + l.payout, 0))}</strong>
                    </div>
                  )}
                  {data.mode === "organise" && data.type === "auction" && !lastWin && (
                    <p className="muted" style={{ marginTop: 12 }}>{copy.chit.recordAuctionBeforeClose}</p>
                  )}
                  {data.mode === "organise" && fixedLike && !lastWin && (
                    <p className="muted" style={{ marginTop: 12 }}>{copy.chit.awardPotBeforeClose}</p>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {tab === "members" && (
          <>
            {!started ? (
              <>
                <div className="row-head" style={{ marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: 13 }}>{tx(copy.chit.membersOf, { count: data.members.length, total: data.membersCount })}</span>
                  <button
                    type="button"
                    className={`info-chip${membersHelpOpen ? " on" : ""}`}
                    aria-expanded={membersHelpOpen}
                    aria-label={copy.chit.membersTabHelpAria}
                    title={copy.chit.membersTabHelpAria}
                    onClick={() => setMembersHelpOpen((v) => !v)}
                  >
                    <Info size={15} strokeWidth={2.4} />
                  </button>
                </div>
                {membersHelpOpen && (
                  <PromptBox tone="teal">{copy.chit.membersBeforeStartHint}</PromptBox>
                )}
                <div className="toolbar">
                  <select className="field" style={{ margin: 0, maxWidth: 260 }} value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
                    <option value="">{copy.chit.addMember} / {copy.chit.addHand}</option>
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
                    disabled={!isRunning || !newMemberId || data.members.length >= data.membersCount}
                    onClick={() => void addMember(data.id, newMemberId).then(() => setNewMemberId(""))}
                  >
                    {data.members.some((m) => m.customerId === newMemberId) ? copy.chit.addHand : copy.chit.addMember}
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={!isRunning || data.members.length >= data.membersCount}
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
                          }
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : copy.chit.couldNotOpenContacts);
                        }
                      })();
                    }}
                  >
                    <BookUser size={15} /> {copy.chit.fromContacts}
                  </button>
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  <input
                    className="field"
                    style={{ margin: 0, maxWidth: 180 }}
                    placeholder={copy.chit.inlineAddName}
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                  />
                  <input
                    className="field"
                    style={{ margin: 0, maxWidth: 140 }}
                    inputMode="tel"
                    placeholder={copy.chit.inlineAddPhone}
                    value={inlinePhone}
                    onChange={(e) => setInlinePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={!isRunning || data.members.length >= data.membersCount || !inlineName.trim() || inlinePhone.length !== 10}
                    onClick={() => {
                      void (async () => {
                        try {
                          const phone = tryPhone10(inlinePhone);
                          if (!phone) return;
                          let cust = customers.find((c) => c.phone === phone);
                          if (!cust) cust = await addCustomer(inlineName.trim(), phone);
                          await addMember(data.id, cust.id);
                          setInlineName("");
                          setInlinePhone("");
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : String(e));
                        }
                      })();
                    }}
                  >
                    {copy.chit.inlineAdd}
                  </button>
                </div>
              </>
            ) : (
              <div className="row-head" style={{ marginBottom: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>{copy.chit.tabs.members}</span>
                <button
                  type="button"
                  className={`info-chip${membersHelpOpen ? " on" : ""}`}
                  aria-expanded={membersHelpOpen}
                  aria-label={copy.chit.membersTabHelpAria}
                  title={copy.chit.membersTabHelpAria}
                  onClick={() => setMembersHelpOpen((v) => !v)}
                >
                  <Info size={15} strokeWidth={2.4} />
                </button>
              </div>
            )}
            {membersHelpOpen && started && (
              <PromptBox tone="amber">{copy.chit.membersAfterStartHint}</PromptBox>
            )}
            {swapSlot != null && (
              <div className="card" style={{ marginBottom: 12, background: "#f8fafc" }}>
                <strong>{copy.chit.swapMemberTitle}</strong>
                <p className="muted" style={{ margin: "6px 0 10px" }}>{copy.chit.swapMemberHint}</p>
                <div className="toolbar" style={{ margin: 0 }}>
                  <select className="field" style={{ margin: 0, maxWidth: 280 }} value={swapToId} onChange={(e) => setSwapToId(e.target.value)}>
                    <option value="">{copy.chit.chooseReplacement}</option>
                    {customers
                      .filter((c) => {
                        const curr = data.members.find((m) => m.slot === swapSlot);
                        return curr && c.id !== curr.customerId;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                      ))}
                  </select>
                  <button
                    className="btn"
                    disabled={!swapToId || !isRunning}
                    onClick={() => {
                      const curr = data.members.find((m) => m.slot === swapSlot);
                      const next = customers.find((c) => c.id === swapToId);
                      if (!curr || !next) return;
                      const ok = window.confirm(
                        tx(copy.chit.swapMemberConfirm, {
                          old: names[curr.customerId] || curr.customerId,
                          new: next.name,
                          slot: String(swapSlot),
                        }),
                      );
                      if (!ok) return;
                      void swapMember(data.id, swapSlot, swapToId).then(() => {
                        setSwapSlot(null);
                        setSwapToId("");
                      });
                    }}
                  >
                    {copy.chit.swapMember}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => { setSwapSlot(null); setSwapToId(""); }}>
                    {copy.common.cancel}
                  </button>
                </div>
                <div className="toolbar" style={{ margin: "8px 0 0" }}>
                  <input
                    className="field"
                    style={{ margin: 0, maxWidth: 160 }}
                    placeholder={copy.chit.inlineAddName}
                    value={inlineName}
                    onChange={(e) => setInlineName(e.target.value)}
                  />
                  <input
                    className="field"
                    style={{ margin: 0, maxWidth: 120 }}
                    inputMode="tel"
                    placeholder={copy.chit.inlineAddPhone}
                    value={inlinePhone}
                    onChange={(e) => setInlinePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={!isRunning || !inlineName.trim() || inlinePhone.length !== 10}
                    onClick={() => {
                      void (async () => {
                        try {
                          const phone = tryPhone10(inlinePhone);
                          if (!phone || swapSlot == null) return;
                          const curr = data.members.find((m) => m.slot === swapSlot);
                          let cust = customers.find((c) => c.phone === phone);
                          if (!cust) cust = await addCustomer(inlineName.trim(), phone);
                          if (curr && cust.id === curr.customerId) {
                            window.alert(copy.chit.samePersonSeat);
                            return;
                          }
                          const ok = window.confirm(
                            tx(copy.chit.swapMemberConfirm, {
                              old: curr ? (names[curr.customerId] || curr.customerId) : "?",
                              new: cust.name,
                              slot: String(swapSlot),
                            }),
                          );
                          if (!ok) return;
                          await swapMember(data.id, swapSlot, cust.id);
                          setSwapSlot(null);
                          setSwapToId("");
                          setInlineName("");
                          setInlinePhone("");
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : String(e));
                        }
                      })();
                    }}
                  >
                    {copy.chit.inlineAdd} + {copy.chit.swapMember}
                  </button>
                </div>
              </div>
            )}
            <div className="card flush member-list-card">
              <div className="member-list-head">
                {tx(copy.chit.membersListMeta, {
                  filled: data.members.length,
                  total: data.membersCount,
                })}
              </div>
              {data.members.length === 0 ? (
                <p className="empty" style={{ margin: 0, padding: "16px 14px" }}>{copy.chitsPage.empty}</p>
              ) : (
                data.members
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((m, i) => {
                    const left = Math.max(0, memberBalance(data, m.customerId, m.slot).outstanding);
                    const cust = customers.find((c) => c.id === m.customerId);
                    return (
                      <div key={`${m.customerId}-${m.slot}`} className="member-list-row">
                        <div className={`avatar tone-${toneAt(i)}`}>{initials(names[m.customerId] || "?")}</div>
                        <div className="grow">
                          <button
                            type="button"
                            className="member-list-name"
                            onClick={() => nav(`/customers/${m.customerId}`)}
                          >
                            {names[m.customerId]}
                          </button>
                          <div className="muted member-list-meta">
                            {tx(copy.chit.handAmountLeft, { n: m.slot, amount: inr(left) })}
                          </div>
                        </div>
                        <div className="member-list-actions">
                          {cust?.phone && !isOnApp(cust.phone) ? (
                            <InviteWhatsAppButton
                              phone={cust.phone}
                              title={copy.reach.inviteWhatsApp}
                              message={inviteMemberWhatsAppMessage({
                                memberName: cust.name,
                                phone: cust.phone,
                                chitName: data.name,
                                organiserName: user?.name,
                                instalment: data.instalment,
                              })}
                            />
                          ) : null}
                          {isRunning && started && (
                            <button
                              type="button"
                              className="btn swap-chip"
                              onClick={() => {
                                setSwapSlot(m.slot);
                                setSwapToId("");
                              }}
                            >
                              {copy.chit.swapMember}
                            </button>
                          )}
                          {isRunning && !started && (
                            <button
                              type="button"
                              className="btn swap-chip"
                              onClick={() => {
                                const ok = window.confirm(
                                  tx(copy.chit.removeMemberConfirm, {
                                    name: names[m.customerId] || m.customerId,
                                    slot: String(m.slot),
                                  }),
                                );
                                if (!ok) return;
                                void removeMember(data.id, m.slot);
                              }}
                            >
                              {copy.chit.removeMember}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}

        {tab === "activity" && (() => {
          const feed = buildActivityLog(data, names);
          const groups = groupActivityByCycle(feed);
          const kindLabel = (k: string) => {
            if (k === "payment") return copy.chit.activityKindPayment;
            if (k === "award") return copy.chit.activityKindAward;
            if (k === "loan") return copy.chit.activityKindLoan;
            if (k === "settlement") return copy.chit.activityKindSettlement;
            if (k === "lucky_draw") return copy.chit.activityKindLuckyDraw;
            return k;
          };
          const kindTone = (k: string) => {
            if (k === "payment") return "green";
            if (k === "loan") return "amber";
            if (k === "settlement") return "violet";
            if (k === "lucky_draw") return "blue";
            return "blue";
          };
          const kindInitial = (k: string) => {
            if (k === "payment") return "C";
            if (k === "loan") return "L";
            if (k === "settlement") return "S";
            if (k === "lucky_draw") return "D";
            return "A";
          };
          const whoLabel = (row: (typeof feed)[0]) =>
            `${row.memberName}${row.slot != null ? tx(copy.chit.activitySlot, { n: row.slot }) : ""}`;
          return (
            <div className="card flush member-list-card">
              <div className="member-list-head">
                {tx(copy.chit.activityListMeta, { n: feed.length })}
              </div>
              {feed.length === 0 ? (
                <p className="empty" style={{ margin: 0, padding: "16px 14px" }}>{copy.chit.activityEmpty}</p>
              ) : (
                <div className="activity-list">
                  {groups.map((group) => (
                    <div key={group.cycle} className="activity-group">
                      <div className="activity-group-head">
                        {tx(copy.chit.activityHaptaHead, { n: group.cycle })}
                      </div>
                      {group.rows.map((row) => {
                        let meta = formatActivityAt(row.at, locale);
                        if (row.kind === "payment") {
                          const kind =
                            copy.payKind[row.paymentKind as keyof typeof copy.payKind] || row.paymentKind || "";
                          const mode = row.mode ? modeLabel(row.mode) || row.mode : "";
                          meta = [kind, mode, meta].filter(Boolean).join(" · ");
                        } else if (row.kind === "loan") {
                          const bits = [
                            row.bid ? tx(copy.chit.activityBid, { amount: inr(row.bid) }) : "",
                            row.interestRate != null ? tx(copy.chit.activityRate, { rate: row.interestRate }) : "",
                            meta,
                          ];
                          meta = bits.filter(Boolean).join(" · ");
                        } else if (row.kind === "award" || row.kind === "lucky_draw") {
                          const bits = [
                            row.method === "auction" && row.bid
                              ? tx(copy.chit.activityBid, { amount: inr(row.bid) })
                              : row.kind === "lucky_draw"
                                ? copy.chit.activityKindLuckyDraw
                                : copy.chit.activityFixedPot,
                            row.commission
                              ? tx(copy.chit.activityCommission, { amount: inr(row.commission) })
                              : "",
                            meta,
                          ];
                          meta = bits.filter(Boolean).join(" · ");
                        }
                        return (
                          <div key={row.id} className="activity-row">
                            <div className={`avatar tone-${kindTone(row.kind)}`}>{kindInitial(row.kind)}</div>
                            <div className="grow">
                              <div className="activity-title-row">
                                <span className={`activity-kind ${row.kind}`}>{kindLabel(row.kind)}</span>
                                <strong className="activity-who">{whoLabel(row)}</strong>
                              </div>
                              <div className="muted member-list-meta">{meta}</div>
                            </div>
                            <div className="activity-amount num">
                              {row.amount != null ? inr(row.amount) : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {tab === "settlement" && showSettlement && (
          <div className="stack">
            <div className="stats four">
              <StatCard
                label={copy.chit.cashOnHand}
                value={<span className={cashOnHand < 0 ? "neg" : undefined}>{inr(cashOnHand)}</span>}
                hint={copy.chit.settlementAvailable}
                tone="teal"
                icon={Wallet}
              />
              <StatCard
                label={copy.chit.loanReceived}
                value={inr(data.auctions.filter((a) => a.method === "fixed").reduce((s, a) => s + a.payout, 0))}
                hint={copy.chit.settlementPrincipalOut}
                tone="blue"
                icon={PiggyBank}
              />
              <StatCard label={copy.chit.interestCollected} value={inr(interestCollected(data))} hint={copy.chit.settlementEarned} tone="green" icon={Percent} />
              <StatCard
                label={copy.chit.dividendsAll}
                value={inr(settlementsOf(data).reduce((s, a) => s + a.payout, 0))}
                hint={copy.chit.settlementPaidOut}
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
                    <div className="kv"><span>{copy.chit.cashAvailable}</span><strong>{inr(Math.max(0, cashOnHand))}</strong></div>
                    <div className="kv"><span>{copy.chit.interestDividendPool}</span><strong>{inr(interestOut)}</strong></div>
                    <div className="kv"><span>{copy.chit.equalLeftover}</span><strong>{inr(equalOut)}</strong></div>
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
                        <th>{copy.chit.equalShare}</th>
                        <th>{copy.chit.totalLabel}</th>
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
              <div className="card-pad"><h2>{copy.chit.loanPositions}</h2></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{copy.chit.hand}</th><th>{copy.chit.loanTaken}</th><th>{copy.chit.paidIn}</th><th>{isRunning ? copy.chit.thisMonthDue : copy.terms.outstanding}</th></tr></thead>
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
                <div className="card-pad"><h2>{copy.chit.settlementHistory}</h2></div>
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
              <h2>{copy.chit.visibility}</h2>
              <label className="check"><input type="checkbox" checked={visible} onChange={(e) => {
                const next = e.target.checked;
                setVisible(next);
                void updateChitSettings(data.id, { memberVisible: next });
              }} /> {copy.chit.memberVisibilityLabel}</label>
            </div>
            <div className="card">
              <h2>{copy.chit.reports}</h2>
              <p className="muted block">
                {copy.chit.reportsHint}
              </p>
              <div className="toolbar" style={{ margin: 0, flexWrap: "wrap", gap: 8 }}>
                <button className="btn" onClick={() => downloadChitReportPdf(data, names)}>{copy.chit.fullLedgerPdf}</button>
                <button className="btn ghost" onClick={() => downloadMonthDuesPdf(data, names)}>{copy.chit.monthDuesPdf}</button>
                {data.type === "loan" ? (
                  <button className="btn ghost" onClick={() => {
                    const last = [...data.auctions].reverse().find((a) => a.method === "fixed");
                    if (last) downloadLoanReportPdf(data, last, names, user?.name, { mode: "download" });
                    else downloadChitReportPdf(data, names);
                  }}>{copy.chit.loanReportPdf}</button>
                ) : (
                  <button className="btn ghost" onClick={() => {
                    const last = [...data.auctions].reverse().find((a) => a.method !== "settlement");
                    if (last) downloadAwardReportPdf(data, last, names, user?.name, { mode: "download" });
                    else downloadChitReportPdf(data, names);
                  }}>{copy.chit.awardReportPdf}</button>
                )}
              </div>
            </div>
            <div className="card">
              <h2>{copy.chit.editChit}</h2>
              <p className="muted block">{copy.chit.editChitHint}</p>
              <button className="btn ghost" onClick={() => { setEditName(data.name); setEditTitle(data.title || ""); setEditOpen(true); }}>{copy.chit.editNameBtn}</button>
            </div>
            <div className="danger-box">
              <div className="row-head" style={{ margin: 0 }}>
                <div>
                  <strong>{copy.chit.cancelGroup}</strong>
                  <p className="muted">{copy.chit.cancelConfirm}</p>
                </div>
                <button className="btn danger" type="button" onClick={() => setCancelOpen(true)}>
                  {copy.chit.cancelSubmit}
                </button>
              </div>
            </div>
          </div>
        )}

        <ReasonModal
          open={cancelOpen}
          title={copy.chit.cancelReasonsTitle}
          hint={copy.chit.cancelReasonsHint}
          options={[
            { id: "membersLeft", label: copy.chit.cancelReasons.membersLeft },
            { id: "completedEarly", label: copy.chit.cancelReasons.completedEarly },
            { id: "disputes", label: copy.chit.cancelReasons.disputes },
            { id: "wrongSetup", label: copy.chit.cancelReasons.wrongSetup },
            { id: "duplicate", label: copy.chit.cancelReasons.duplicate },
            { id: "other", label: copy.chit.cancelReasons.other },
          ]}
          otherLabel={copy.profile.deleteReasonOther}
          otherPlaceholder={copy.profile.deleteReasonOtherPlaceholder}
          confirmLabel={copy.chit.cancelSubmit}
          cancelLabel={copy.common.cancel}
          multi
          danger
          busy={cancelBusy}
          onClose={() => setCancelOpen(false)}
          onConfirm={async (reasons, note) => {
            setCancelBusy(true);
            try {
              const payload = note ? [...reasons, `note:${note}`] : reasons;
              await cancelChit(data.id, payload);
              setCancelOpen(false);
              nav("/chits");
            } catch {
              /* store sets error */
            } finally {
              setCancelBusy(false);
            }
          }}
        />
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
            <h2>{copy.chit.editChit}</h2>
            <label className="label">{copy.chit.editName}</label>
            <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="label">{copy.chit.titleOptional}</label>
            <input className="field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={() => setEditOpen(false)}>{copy.common.cancel}</button>
              <button className="btn" disabled={editSaving || !editName.trim()}>{editSaving ? copy.chit.saving : copy.common.save}</button>
            </div>
          </form>
        </div>
      )}

      {awardShare && (
        <div className="modal-back" onClick={() => { setAwardShare(null); if (celebrate === "award") setCelebrate(null); }}>
          <div
            className="modal loan-share-banner celebrate-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="award-share-title"
          >
            <div className="celebrate-burst" aria-hidden><i /><i /><i /><i /><i /><i /></div>
            <span className="celebrate-emoji" aria-hidden>🎉</span>
            <h2 id="award-share-title" style={{ margin: "0 0 6px" }}>
              {data.type === "loan" ? copy.chit.loanShareTitle : copy.chit.awardShareTitle}
            </h2>
            <p className="muted" style={{ margin: "0 0 12px" }}>
              {data.type === "loan" ? copy.chit.loanShareHint : copy.chit.awardShareHint}
            </p>
            <div className="loan-share-row">
              <button type="button" className="btn" onClick={() => shareAwardPdfWhatsApp(awardShare)}>
                <Share2 size={15} /> {copy.chit.sharePdfWhatsApp}
              </button>
              <button type="button" className="btn ghost" onClick={() => shareAwardPdfOnly(awardShare)}>
                {copy.chit.pdfOnly}
              </button>
              <button type="button" className="btn ghost" onClick={() => { setAwardShare(null); if (celebrate === "award") setCelebrate(null); }}>
                {copy.chit.dismiss}
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrate === "completed" && (
        <div className="modal-back" onClick={() => setCelebrate(null)}>
          <div
            className="modal celebrate-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bhishi-done-title"
          >
            <div className="celebrate-burst" aria-hidden><i /><i /><i /><i /><i /><i /></div>
            <span className="celebrate-emoji" aria-hidden>🎊</span>
            <h2 id="bhishi-done-title" style={{ margin: "0 0 6px" }}>{copy.chit.completedTitle}</h2>
            <p className="muted" style={{ margin: "0 0 14px" }}>{copy.chit.completedHint}</p>
            <div className="loan-share-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCelebrate(null);
                  setTab("settings");
                }}
              >
                {copy.chit.goToReports}
              </button>
              <button type="button" className="btn ghost" onClick={() => setCelebrate(null)}>
                {copy.chit.dismiss}
              </button>
            </div>
          </div>
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
