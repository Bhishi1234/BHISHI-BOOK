import type { AuctionRecord, Chit, Customer, Payment, Ticket, User } from "../types";

function num(v: unknown) {
  return Number(v || 0);
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id ?? ""),
    name: String(row.name || "Organiser"),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    plan: (row.plan as User["plan"]) || "free",
    language: String(row.language || "en"),
    billingMode: (row.billing_mode as User["billingMode"]) || (row.billingMode as User["billingMode"]) || "payg",
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    phone: String(row.phone || ""),
  };
}

export function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    memberId: String(row.member_id ?? row.memberId ?? ""),
    slot: row.member_slot != null || row.slot != null
      ? num(row.member_slot ?? row.slot)
      : undefined,
    cycle: num(row.cycle),
    amount: num(row.amount),
    kind: (row.kind as Payment["kind"]) || "full",
    date: String(row.paid_at ?? row.date ?? ""),
    note: row.note ? String(row.note) : undefined,
    mode: (row.mode as Payment["mode"]) || "cash",
  };
}

export function mapAuction(row: Record<string, unknown>): AuctionRecord {
  return {
    id: row.id ? String(row.id) : undefined,
    cycle: num(row.cycle),
    winnerId: String(row.winner_id ?? row.winnerId ?? ""),
    winnerSlot: row.winner_slot != null || row.winnerSlot != null
      ? num(row.winner_slot ?? row.winnerSlot)
      : undefined,
    bid: num(row.bid),
    method: (row.method as AuctionRecord["method"]) || "auction",
    discount: num(row.discount),
    commission: num(row.commission),
    dividend: num(row.dividend),
    payout: num(row.payout),
    arrearsWithheld: num(row.arrears_withheld ?? row.arrearsWithheld),
  };
}

export function mapTicket(row: Record<string, unknown>): Ticket {
  return {
    id: String(row.id),
    subject: String(row.subject || ""),
    message: String(row.message || ""),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    status: (row.status as Ticket["status"]) || "open",
  };
}

export function mapChit(row: Record<string, unknown>, viewerRole?: Chit["viewerRole"]): Chit {
  const members = (row.members ?? row.chit_members ?? []) as Record<string, unknown>[];
  const payments = (row.payments ?? []) as Record<string, unknown>[];
  const auctions = (row.auctions ?? []) as Record<string, unknown>[];
  return {
    id: String(row.id),
    viewerRole,
    name: String(row.name || ""),
    title: row.title ? String(row.title) : undefined,
    type: row.type as Chit["type"],
    frequency: (row.frequency as Chit["frequency"]) || "monthly",
    pot: num(row.pot),
    instalment: num(row.instalment),
    membersCount: num(row.members_count ?? row.membersCount),
    commissionPct: num(row.commission_pct ?? row.commissionPct),
    duration: num(row.duration),
    startDate: String(row.start_date ?? row.startDate ?? ""),
    mode: (row.mode as Chit["mode"]) || "organise",
    status: (row.status as Chit["status"]) || "running",
    currentCycle: num(row.current_cycle ?? row.currentCycle) || 1,
    premiumAmount: row.premium_amount != null || row.premiumAmount != null
      ? num(row.premium_amount ?? row.premiumAmount)
      : undefined,
    interestRate: row.interest_rate != null || row.interestRate != null
      ? num(row.interest_rate ?? row.interestRate)
      : undefined,
    repaymentTenure: row.repayment_tenure != null || row.repaymentTenure != null
      ? num(row.repayment_tenure ?? row.repaymentTenure)
      : undefined,
    commissionKind: (row.commission_kind as Chit["commissionKind"]) || (row.commissionKind as Chit["commissionKind"]),
    commissionValue: num(row.commission_value ?? row.commissionValue),
    adjustmentStyle: (row.adjustment_style as Chit["adjustmentStyle"]) || (row.adjustmentStyle as Chit["adjustmentStyle"]),
    auctionStyle: (row.auction_style as Chit["auctionStyle"]) || (row.auctionStyle as Chit["auctionStyle"]) || "collect_first",
    fixedStyle: (row.type === "lucky_draw" || row.fixedStyle === "lucky_draw"
      ? "lucky_draw"
      : row.type === "hand_sacrifice" || row.fixedStyle === "hand_sacrifice"
        ? "hand_sacrifice"
        : row.type === "fixed" || row.type === "base_premium"
          ? "fixed_order"
          : undefined) as Chit["fixedStyle"],
    remindDays: (row.remind_days as number[]) || (row.remindDays as number[]) || [],
    memberVisible: Boolean(row.member_visible ?? row.memberVisible),
    members: members
      .map((m) => ({
        id: m.id ? String(m.id) : undefined,
        customerId: String(m.customer_id ?? m.customerId ?? ""),
        slot: num(m.slot),
        prizedCycle: m.prized_cycle != null || m.prizedCycle != null
          ? num(m.prized_cycle ?? m.prizedCycle)
          : undefined,
      }))
      .sort((a, b) => a.slot - b.slot),
    payments: payments.map(mapPayment),
    auctions: auctions.map(mapAuction).sort((a, b) => a.cycle - b.cycle),
  };
}

export function chitPayload(input: Omit<Chit, "id" | "payments" | "status">) {
  return {
    name: input.name,
    title: input.title ?? "",
    type: input.type,
    frequency: input.frequency,
    pot: input.pot,
    instalment: input.instalment,
    membersCount: input.membersCount,
    commissionPct: input.commissionPct,
    duration: input.duration,
    startDate: input.startDate,
    mode: input.mode,
    premiumAmount: input.premiumAmount ?? "",
    interestRate: input.interestRate ?? "",
    repaymentTenure: input.repaymentTenure ?? "",
    commissionKind: input.commissionKind ?? "percent",
    commissionValue: input.commissionValue ?? 0,
    adjustmentStyle: input.adjustmentStyle ?? "every_month",
    auctionStyle: input.auctionStyle ?? "collect_first",
    remindDays: input.remindDays ?? [],
    memberVisible: Boolean(input.memberVisible),
    members: input.members.map((m) => ({ customerId: m.customerId, slot: m.slot })),
  };
}
