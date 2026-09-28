import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookUser, Plus, Trash2, UserPlus } from "lucide-react";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { scrollPageToTop } from "../layout/ScrollToTop";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import type { AuctionStyle, ChitType, FixedStyle } from "../types";
import { inr } from "../lib/format";
import { chitEndDate, computeInstalment } from "../lib/chitMath";
import { frequencyForInterval, HAPTA_PRESETS } from "../lib/haptaInterval";
import { pickContactsFromBook } from "../lib/contacts";
import { inviteMemberWhatsAppMessage, tryPhone10 } from "../lib/share";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { useStore } from "../store";

const STEPS = 8;
const POT_CHIPS = [100000, 200000, 500000];
const PEOPLE_CHIPS = [10, 15, 20];

function Choice({
  on,
  title,
  body,
  onClick,
}: {
  on: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`create-choice${on ? " on" : ""}`} onClick={onClick}>
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  );
}

function prettyDate(iso: string, locale: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NewChitPage() {
  const { customers, addCustomer, addChit, error, user } = useStore();
  const { m, tx, typeLabel, locale } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ChitType>("auction");
  const [auctionStyle, setAuctionStyle] = useState<AuctionStyle>("collect_first");
  const [fixedStyle, setFixedStyle] = useState<FixedStyle>("fixed_order");
  const [pot, setPot] = useState("");
  const [count, setCount] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [presetDays, setPresetDays] = useState(30);
  const [customOn, setCustomOn] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const [adjust, setAdjust] = useState<"every_month" | "at_end">("every_month");
  const [tenure, setTenure] = useState("");
  const [loanPrincipalMode, setLoanPrincipalMode] = useState<"emi" | "end">("emi");
  const [loanInterestUpfront, setLoanInterestUpfront] = useState(true);
  const [visible, setVisible] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [manualHands, setManualHands] = useState(1);
  const [existingPick, setExistingPick] = useState("");
  const [existingHands, setExistingHands] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pickingContacts, setPickingContacts] = useState(false);
  const [addPanel, setAddPanel] = useState<"new" | "saved" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const { isOnApp } = usePhonesOnApp(customers.map((c) => c.phone));
  const intervalDays = customOn ? Math.floor(Number(customDays) || 0) : presetDays;
  const intervalOk = intervalDays >= 1 && intervalDays <= 3660;
  const n = Number(count) || 0;
  const potN = Number(pot) || 0;
  const instalment = computeInstalment(potN, n);
  const tenureN = Number(tenure) || 0;
  const slotsFull = !!n && picked.length >= n;
  const slotsLeft = n > 0 ? Math.max(0, n - picked.length) : 99;
  const maxHandsPick = Math.max(1, slotsLeft || 1);
  const copy = m.createFlow;
  const kindName = type === "loan" ? copy.loan : type === "fixed" ? copy.fixed : copy.auction;
  const suggestedName = potN ? `${kindName} · ${inr(potN)}` : "";
  const groupName = nameTouched ? title : suggestedName;
  const showPayoutOrder = type === "fixed" && (fixedStyle === "fixed_order" || fixedStyle === "hand_sacrifice");
  const showMore = type === "loan" || type === "fixed" || (type === "auction" && auctionStyle === "collect_first");

  useEffect(() => {
    setManualHands((v) => Math.min(Math.max(1, v), maxHandsPick));
    setExistingHands((v) => Math.min(Math.max(1, v), maxHandsPick));
  }, [maxHandsPick]);

  useEffect(() => {
    if (n > 0 && picked.length > n) setPicked((p) => p.slice(0, n));
  }, [n, picked.length]);

  useEffect(() => {
    scrollPageToTop();
    const t = window.setTimeout(scrollPageToTop, 80);
    return () => window.clearTimeout(t);
  }, [step]);

  function setPeople(raw: string) {
    setCount(raw.replace(/\D/g, "").slice(0, 4));
  }

  function canAdvance() {
    if (step === 2) return potN > 0;
    if (step === 3) return n >= 1;
    if (step === 4) return intervalOk;
    if (step === 5) return Boolean(start);
    if (step === 6) return n > 0 && picked.length === n;
    return true;
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    if (!canAdvance()) return;
    setStep((s) => Math.min(STEPS - 1, s + 1));
  }

  async function addFromContacts() {
    setPickingContacts(true);
    try {
      const rows = await pickContactsFromBook({ multiple: true });
      for (const row of rows) {
        const phone = tryPhone10(row.phone);
        if (!phone) continue;
        let customerId = customers.find((c) => c.phone === phone)?.id;
        if (!customerId) {
          const created = await addCustomer(row.name.trim() || m.common.member, phone);
          customerId = created.id;
        }
        setPicked((p) => (n > 0 && p.length >= n ? p : [...p, customerId!]));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : m.chit.couldNotOpenContacts;
      window.alert(msg);
    } finally {
      setPickingContacts(false);
    }
  }

  function inviteMsg(name: string, phone: string) {
    return inviteMemberWhatsAppMessage({
      memberName: name,
      phone,
      chitName: groupName.trim() || undefined,
      organiserName: user?.name,
      instalment: instalment || undefined,
    });
  }

  const resolvedType: ChitType =
    type === "fixed"
      ? fixedStyle === "lucky_draw"
        ? "lucky_draw"
        : fixedStyle === "hand_sacrifice"
          ? "hand_sacrifice"
          : "fixed"
      : type;

  const fixedTurn = fixedStyle === "lucky_draw"
    ? copy.luckyDraw
    : fixedStyle === "hand_sacrifice"
      ? copy.sacrifice
      : copy.inOrder;
  const turnLabel =
    type === "auction"
      ? auctionStyle === "auction_first"
        ? copy.auctionFirst
        : copy.collectFirst
      : type === "loan"
        ? auctionStyle === "auction_first"
          ? copy.loanFirst
          : copy.collectFirst
        : auctionStyle === "auction_first"
          ? `${fixedTurn} · ${copy.awardFirst}`
          : fixedTurn;

  const endDate = intervalOk && n && start
    ? chitEndDate({
      startDate: start,
      frequency: frequencyForInterval(intervalDays),
      haptaIntervalDays: intervalDays,
      duration: n,
    })
    : null;
  const endLabel = endDate && !Number.isNaN(endDate.getTime())
    ? endDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
    : "";

  async function create() {
    if (!n || n < 1) {
      window.alert(m.newChitExtra.setMembersAlert);
      return;
    }
    if (picked.length !== n) {
      window.alert(tx(m.newChitExtra.fillSlotsAlert, { n, filled: picked.length }));
      return;
    }
    if (!potN) {
      window.alert(m.newChitExtra.enterPotAlert);
      return;
    }
    if (!intervalOk) {
      window.alert(m.freq.invalidDays);
      return;
    }
    setSaving(true);
    try {
      const members = picked.map((customerId, i) => ({ customerId, slot: i + 1 }));
      const typeTitle = typeLabel(resolvedType) || kindName;
      const id = await addChit({
        name: groupName.trim() || `${typeTitle} - ${inr(potN)}`,
        title: groupName.trim() || undefined,
        type: resolvedType,
        frequency: frequencyForInterval(intervalDays),
        haptaIntervalDays: intervalDays,
        pot: potN,
        instalment,
        membersCount: n,
        commissionPct: 0,
        duration: n,
        startDate: start,
        mode: "organise",
        members,
        auctions: [],
        currentCycle: 1,
        commissionKind: "amount",
        commissionValue: 0,
        adjustmentStyle: type === "auction" ? adjust : "every_month",
        auctionStyle,
        fixedStyle: type === "fixed" ? fixedStyle : undefined,
        repaymentTenure: type === "loan" && tenureN > 0 ? tenureN : undefined,
        loanPrincipalMode: type === "loan" ? loanPrincipalMode : undefined,
        loanInterestUpfront: type === "loan" ? loanInterestUpfront : undefined,
        remindDays: [],
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
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      return next;
    });
  }

  function removePickAt(idx: number) {
    setPicked((p) => p.filter((_, i) => i !== idx));
  }

  async function addManualMember() {
    if (!newName.trim() || slotsFull) return;
    const hands = Math.min(Math.max(1, manualHands), slotsLeft);
    const c = await addCustomer(newName.trim(), newPhone.trim());
    setPicked((p) => [...p, ...Array.from({ length: hands }, () => c.id)]);
    setNewName("");
    setNewPhone("");
    setManualHands(1);
    setAddPanel(null);
  }

  function addExistingMember() {
    if (!existingPick || slotsFull) return;
    const hands = Math.min(Math.max(1, existingHands), slotsLeft);
    setPicked((p) => [...p, ...Array.from({ length: hands }, () => existingPick)]);
    setExistingPick("");
    setExistingHands(1);
    setAddPanel(null);
  }

  function bumpHands(kind: "manual" | "existing", delta: number) {
    const setter = kind === "manual" ? setManualHands : setExistingHands;
    setter((v) => Math.min(maxHandsPick, Math.max(1, v + delta)));
  }

  const heading =
    step === 0 ? copy.kindTitle
      : step === 1 ? copy.turnTitle
        : step === 2 ? copy.potTitle
          : step === 3 ? copy.peopleTitle
            : step === 4 ? copy.oftenTitle
              : step === 5 ? copy.startTitle
                : step === 6 ? copy.whoTitle
                  : copy.checkTitle;
  const lead =
    step === 0 ? copy.kindLead
      : step === 1 ? (type === "loan" ? copy.turnLoan : type === "fixed" ? copy.turnFixed : copy.turnAuction)
        : step === 2 ? copy.potLead
          : step === 3 ? copy.peopleLead
            : step === 4 ? copy.oftenLead
              : step === 6 && n
                ? tx(m.newChitExtra.slotsFilled, { filled: picked.length, total: n })
                : "";

  return (
    <AppShell crumb={m.nav.chits} crumb2={m.newChit.title}>
      <div className="page new-chit-page create-flow">
        <p className="create-kicker">{tx(copy.stepOf, { n: step + 1, total: STEPS })}</p>
        <div className="create-dots" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i < step ? "done" : i === step ? "on" : ""} />
          ))}
        </div>
        {step > 0 && (
          <button type="button" className="hapta-back create-back" onClick={goBack}>
            {m.common.back}
          </button>
        )}
        <h2>{heading}</h2>
        {lead ? <p className="create-lead">{lead}</p> : null}
        {error && <p className="due">{error}</p>}

        {step === 0 && (
          <div className="create-choices">
            <Choice on={type === "auction"} title={copy.auction} body={copy.auctionBody} onClick={() => setType("auction")} />
            <Choice on={type === "fixed"} title={copy.fixed} body={copy.fixedBody} onClick={() => setType("fixed")} />
            <Choice on={type === "loan"} title={copy.loan} body={copy.loanBody} onClick={() => setType("loan")} />
          </div>
        )}

        {step === 1 && type === "auction" && (
          <div className="create-choices">
            <Choice on={auctionStyle === "collect_first"} title={copy.collectFirst} body={copy.collectFirstAuction} onClick={() => setAuctionStyle("collect_first")} />
            <Choice on={auctionStyle === "auction_first"} title={copy.auctionFirst} body={copy.auctionFirstBody} onClick={() => setAuctionStyle("auction_first")} />
          </div>
        )}
        {step === 1 && type === "fixed" && (
          <div className="create-choices">
            <Choice on={fixedStyle === "fixed_order"} title={copy.inOrder} body={copy.inOrderBody} onClick={() => setFixedStyle("fixed_order")} />
            <Choice on={fixedStyle === "lucky_draw"} title={copy.luckyDraw} body={copy.luckyDrawBody} onClick={() => setFixedStyle("lucky_draw")} />
            <Choice on={fixedStyle === "hand_sacrifice"} title={copy.sacrifice} body={copy.sacrificeBody} onClick={() => setFixedStyle("hand_sacrifice")} />
          </div>
        )}
        {step === 1 && type === "loan" && (
          <div className="create-choices">
            <Choice on={auctionStyle === "collect_first"} title={copy.collectFirst} body={copy.collectFirstLoan} onClick={() => setAuctionStyle("collect_first")} />
            <Choice on={auctionStyle === "auction_first"} title={copy.loanFirst} body={copy.loanFirstBody} onClick={() => setAuctionStyle("auction_first")} />
          </div>
        )}

        {step === 2 && (
          <div className="card create-card">
            <label className="label" htmlFor="create-pot">{copy.potLabel}</label>
            <input
              id="create-pot"
              className="field"
              inputMode="numeric"
              placeholder="100000"
              value={pot}
              onChange={(e) => setPot(e.target.value.replace(/\D/g, "").slice(0, 9))}
            />
            <div className="create-picks">
              {POT_CHIPS.map((v) => (
                <button key={v} type="button" className={`chip ${pot === String(v) ? "on" : ""}`} onClick={() => setPot(String(v))}>
                  {inr(v)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="card create-card">
              <label className="label" htmlFor="create-people">{copy.peopleLabel}</label>
              <input
                id="create-people"
                className="field"
                inputMode="numeric"
                placeholder="10"
                value={count}
                onChange={(e) => setPeople(e.target.value)}
              />
              <div className="create-picks">
                {PEOPLE_CHIPS.map((v) => (
                  <button key={v} type="button" className={`chip ${count === String(v) ? "on" : ""}`} onClick={() => setPeople(String(v))}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {n > 0 && <p className="create-note">{tx(copy.haptasWillBe, { n })}</p>}
          </>
        )}

        {step === 4 && (
          <>
            <div className="create-picks">
              {HAPTA_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`chip ${!customOn && presetDays === days ? "on" : ""}`}
                  onClick={() => {
                    setCustomOn(false);
                    setPresetDays(days);
                  }}
                >
                  {days === 1 ? m.freq.oneDay : days === 7 ? m.freq.oneWeek : days === 15 ? m.freq.days15 : m.freq.days30}
                </button>
              ))}
              <button type="button" className={`chip ${customOn ? "on" : ""}`} onClick={() => setCustomOn(true)}>
                {copy.other}
              </button>
            </div>
            {customOn && (
              <input
                className="field hapta-days-field"
                inputMode="numeric"
                placeholder={m.freq.customDaysPh}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
                aria-label={m.freq.custom}
              />
            )}
            {intervalOk && n > 0 ? (
              <p className="create-note">
                {intervalDays === 1
                  ? tx(copy.oftenPeopleDay, { people: n })
                  : tx(copy.oftenPeopleDays, { people: n, days: intervalDays })}
                <br />
                {tx(copy.oftenRun, { total: n * intervalDays, date: endLabel })}
              </p>
            ) : (
              <p className="due">{m.freq.invalidDays}</p>
            )}
          </>
        )}

        {step === 5 && (
          <div className="card create-card">
            <label className="label" htmlFor="create-start">{m.newChit.startDate}</label>
            <input id="create-start" className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <label className="label" htmlFor="create-name">{m.newChit.groupName}</label>
            <input
              id="create-name"
              className="field"
              value={groupName}
              onChange={(e) => {
                setNameTouched(true);
                setTitle(e.target.value);
              }}
            />
            <p className="hint">{copy.nameHint}</p>
          </div>
        )}

        {step === 6 && (
          <>
            {showPayoutOrder && <p className="create-lead">{copy.orderHint}</p>}
            {picked.length > 0 && (
              <div className="picked-list card create-card">
                {picked.map((id, i) => {
                  const c = customers.find((x) => x.id === id);
                  const handNo = picked.slice(0, i + 1).filter((x) => x === id).length;
                  const totalHands = picked.filter((x) => x === id).length;
                  const needsInvite = Boolean(c?.phone) && !isOnApp(c?.phone);
                  return (
                    <div key={`${id}-${i}`} className="picked-row">
                      <span className="picked-slot">{tx(m.newChitExtra.slotN, { n: i + 1 })}</span>
                      <div className="grow">
                        <div className="member-name-row">
                          <strong>{c?.name || id}</strong>
                          {totalHands > 1 ? <span className="muted"> · {tx(m.chit.handOf, { n: handNo })}</span> : null}
                          {needsInvite && c?.phone ? (
                            <InviteWhatsAppButton phone={c.phone} message={inviteMsg(c.name, c.phone)} />
                          ) : null}
                        </div>
                        {c?.phone ? <div className="muted">{c.phone}</div> : null}
                      </div>
                      {showPayoutOrder && (
                        <>
                          <button type="button" className="btn ghost btn-sm" disabled={i === 0} onClick={() => movePick(i, -1)} aria-label="↑">↑</button>
                          <button type="button" className="btn ghost btn-sm" disabled={i === picked.length - 1} onClick={() => movePick(i, 1)} aria-label="↓">↓</button>
                        </>
                      )}
                      <button type="button" className="icon-btn" aria-label={m.newChitExtra.removeHand} onClick={() => removePickAt(i)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!slotsFull && addPanel !== "new" && (
              <button type="button" className="btn wide" onClick={() => setAddPanel("new")}>
                <Plus size={15} /> {copy.addPerson}
              </button>
            )}
            {addPanel === "new" && !slotsFull && (
              <div className="card create-card">
                <input className="field" placeholder={m.profile.name} value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input className="field" placeholder={m.profile.phone} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <div className="hands-stepper">
                  <span className="hands-stepper-label">{m.newChitExtra.noOfHands}</span>
                  <div className="hands-stepper-controls">
                    <button type="button" className="btn ghost hands-stepper-btn" disabled={manualHands <= 1} onClick={() => bumpHands("manual", -1)} aria-label="−">−</button>
                    <input className="field hands-stepper-input" inputMode="numeric" value={manualHands} onChange={(e) => setManualHands(Math.min(maxHandsPick, Math.max(1, Math.floor(Number(e.target.value) || 1))))} aria-label={m.newChitExtra.noOfHands} />
                    <button type="button" className="btn ghost hands-stepper-btn" disabled={manualHands >= maxHandsPick} onClick={() => bumpHands("manual", 1)} aria-label="+">+</button>
                  </div>
                </div>
                <button className="btn wide" type="button" disabled={!newName.trim()} onClick={() => void addManualMember()}>
                  {m.newChit.addMember}
                </button>
              </div>
            )}

            <button type="button" className="hapta-text-btn" onClick={() => setAddPanel(addPanel === "saved" ? null : "saved")}>
              {copy.pickSaved}
            </button>
            {addPanel === "saved" && !slotsFull && (
              <div className="card create-card">
                <select className="field" value={existingPick} disabled={!customers.length} onChange={(e) => setExistingPick(e.target.value)}>
                  <option value="">{m.newChitExtra.chooseExisting}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                  ))}
                </select>
                <div className="hands-stepper">
                  <span className="hands-stepper-label">{m.newChitExtra.noOfHands}</span>
                  <div className="hands-stepper-controls">
                    <button type="button" className="btn ghost hands-stepper-btn" disabled={existingHands <= 1} onClick={() => bumpHands("existing", -1)} aria-label="−">−</button>
                    <input className="field hands-stepper-input" inputMode="numeric" value={existingHands} onChange={(e) => setExistingHands(Math.min(maxHandsPick, Math.max(1, Math.floor(Number(e.target.value) || 1))))} aria-label={m.newChitExtra.noOfHands} />
                    <button type="button" className="btn ghost hands-stepper-btn" disabled={existingHands >= maxHandsPick} onClick={() => bumpHands("existing", 1)} aria-label="+">+</button>
                  </div>
                </div>
                <button type="button" className="btn ghost wide" disabled={!existingPick} onClick={addExistingMember}>
                  <UserPlus size={15} /> {m.newChit.addHand}
                </button>
                <div className="member-phonebook">
                  <button className="btn ghost wide" type="button" disabled={pickingContacts} onClick={() => void addFromContacts()}>
                    <BookUser size={15} /> {pickingContacts ? m.newChitExtra.opening : m.newChitExtra.fromPhonebook}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === 7 && (
          <>
            <div className="card create-card create-review">
              <div><span>{copy.kind}</span><strong>{kindName}</strong></div>
              <div><span>{copy.turn}</span><strong>{turnLabel}</strong></div>
              <div><span>{copy.pot}</span><strong>{inr(potN)}</strong></div>
              <div><span>{copy.people}</span><strong>{tx(copy.peopleLine, { n, amount: inr(instalment) })}</strong></div>
              <div><span>{copy.pay}</span><strong>{intervalDays === 1 ? copy.everyDay : tx(copy.everyDays, { n: intervalDays })}</strong></div>
              <div><span>{copy.dates}</span><strong>{tx(copy.datesLine, { start: prettyDate(start, locale), end: endLabel })}</strong></div>
              <div><span>{copy.name}</span><strong>{groupName}</strong></div>
              <label className="check create-see">
                <span>{m.newChit.memberVisible}</span>
                <input className="toggle" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
              </label>
            </div>
            {showMore && (
              <button type="button" className="hapta-text-btn" onClick={() => setMoreOpen((v) => !v)}>
                {moreOpen ? copy.hideChoices : copy.moreChoices}
              </button>
            )}
            {moreOpen && showMore && (
              <div className="card create-card">
                {type === "auction" && auctionStyle === "collect_first" && (
                  <>
                    <label className="label">{m.newChitExtra.adjustmentStyle}</label>
                    <div className="create-picks">
                      <button type="button" className={`chip ${adjust === "every_month" ? "on" : ""}`} onClick={() => setAdjust("every_month")}>{m.newChitExtra.everyMonth}</button>
                      <button type="button" className={`chip ${adjust === "at_end" ? "on" : ""}`} onClick={() => setAdjust("at_end")}>{m.newChitExtra.atEnd}</button>
                    </div>
                  </>
                )}
                {type === "fixed" && (
                  <>
                    <label className="label">{m.settlementStyle.title}</label>
                    <div className="create-picks">
                      <button type="button" className={`chip ${auctionStyle === "collect_first" ? "on" : ""}`} onClick={() => setAuctionStyle("collect_first")}>{copy.collectFirst}</button>
                      <button type="button" className={`chip ${auctionStyle === "auction_first" ? "on" : ""}`} onClick={() => setAuctionStyle("auction_first")}>{copy.awardFirst}</button>
                    </div>
                  </>
                )}
                {type === "loan" && (
                  <>
                    <label className="label">{m.newChitExtra.interestCutLabel}</label>
                    <div className="create-picks">
                      <button type="button" className={`chip ${loanInterestUpfront ? "on" : ""}`} onClick={() => setLoanInterestUpfront(true)}>{m.newChitExtra.interestCutAtGive}</button>
                      <button type="button" className={`chip ${!loanInterestUpfront ? "on" : ""}`} onClick={() => setLoanInterestUpfront(false)}>{m.newChitExtra.interestCutNextMonth}</button>
                    </div>
                    <label className="label">{m.newChitExtra.repaymentTenureLabel}</label>
                    <input className="field" placeholder={m.newChitExtra.blankRestOfChit} value={tenure} onChange={(e) => setTenure(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                    <label className="label">{m.newChitExtra.principalModeLabel}</label>
                    <div className="create-picks">
                      <button type="button" className={`chip ${loanPrincipalMode === "emi" ? "on" : ""}`} onClick={() => setLoanPrincipalMode("emi")}>{m.newChitExtra.principalEmi}</button>
                      <button type="button" className={`chip ${loanPrincipalMode === "end" ? "on" : ""}`} onClick={() => setLoanPrincipalMode("end")}>{m.newChitExtra.principalAtEnd}</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div className="create-actions">
          {step < 6 && (
            <button type="button" className="btn wide" disabled={!canAdvance()} onClick={goNext}>{m.common.next}</button>
          )}
          {step === 6 && (
            <button type="button" className="btn wide" disabled={!canAdvance()} onClick={goNext}>{m.common.next}</button>
          )}
          {step === 7 && (
            <button type="button" className="btn wide green" disabled={saving || picked.length !== n || !potN || !intervalOk} onClick={() => void create()}>
              {saving ? m.newChit.creating : copy.startBhishi}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
