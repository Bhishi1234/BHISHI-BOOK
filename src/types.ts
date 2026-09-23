export type ChitType = "auction" | "fixed" | "base_premium" | "loan" | "lucky_draw" | "hand_sacrifice";

/** Fixed bhishi subtype: slot order, lucky-draw roll, or early hand-sacrifice with cash dividends. */
export type FixedStyle = "fixed_order" | "lucky_draw" | "hand_sacrifice";

export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "halfyearly"
  | "yearly";

export type ChitMode = "organise" | "tracking";
export type ChitStatus = "running" | "cancelled" | "completed";
export type PaymentKind = "full" | "partial" | "advance";
export type PayMode = "cash" | "upi" | "bank" | "cheque" | "adjusted";
export type PlanId = "free" | "pro" | "power";

/** Collect first = pot gathered then auction; auction first = bid first, then each pays bid/n. */
export type AuctionStyle = "collect_first" | "auction_first";

export type User = {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  plan: PlanId;
  language?: string;
  billingMode?: "subscription" | "payg";
  planExpiresAt?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Payment = {
  id: string;
  memberId: string;
  /** Which hand/slot this receipt belongs to (multi-hand). */
  slot?: number;
  cycle: number;
  amount: number;
  kind: PaymentKind;
  date: string;
  note?: string;
  mode?: PayMode;
};

export type AuctionRecord = {
  cycle: number;
  winnerId: string;
  /** Which hand/slot won (multi-hand). */
  winnerSlot?: number;
  bid: number;
  method: "auction" | "lucky_draw" | "fixed" | "settlement";
  discount: number;
  commission: number;
  dividend: number;
  payout: number;
  arrearsWithheld: number;
  id?: string;
};

export type ChitMember = {
  id?: string;
  customerId: string;
  slot: number;
  prizedCycle?: number;
};

export type Chit = {
  id: string;
  name: string;
  type: ChitType;
  frequency: Frequency;
  pot: number;
  instalment: number;
  membersCount: number;
  commissionPct: number;
  duration: number;
  startDate: string;
  mode: ChitMode;
  status: ChitStatus;
  members: ChitMember[];
  auctions: AuctionRecord[];
  payments: Payment[];
  currentCycle: number;
  premiumAmount?: number;
  interestRate?: number;
  repaymentTenure?: number;
  /**
   * Loan repayment of principal:
   * - emi: principal share each repayment month (default)
   * - end: interest (+ hapta) each month; full principal on the last repayment month
   */
  loanPrincipalMode?: "emi" | "end";
  title?: string;
  commissionKind?: "amount" | "percent";
  commissionValue?: number;
  adjustmentStyle?: "every_month" | "at_end";
  /** Hapta order for every type: collect_first (default) or auction_first (award/loan first). */
  auctionStyle?: AuctionStyle;
  /** Fixed family: fixed_order (default) or lucky_draw — mirrors chit type for lucky_draw. */
  fixedStyle?: FixedStyle;
  remindDays?: number[];
  memberVisible?: boolean;
  /** @deprecated Legacy fixed premium modes — new chits are flat dues only. */
  fixedPayMode?: "flat" | "premium" | "variable";
  /** @deprecated */
  winnerPayKind?: "amount" | "interest";
  winnerInterestPct?: number;
  /** @deprecated */
  winningMonthPolicy?: "nothing" | "normal" | "premium";
  /** owner = you organise this chit; member = shared via phone + member visibility. */
  viewerRole?: "owner" | "member";
};

export type Ticket = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "open" | "closed";
};
