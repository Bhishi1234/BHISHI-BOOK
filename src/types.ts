export type ChitType = "auction" | "fixed" | "base_premium" | "loan" | "lucky_draw";

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

export type User = {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  plan: PlanId;
  language?: string;
  billingMode?: "subscription" | "payg";
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Payment = {
  id: string;
  memberId: string;
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
  title?: string;
  commissionKind?: "amount" | "percent";
  commissionValue?: number;
  adjustmentStyle?: "every_month" | "at_end";
  remindDays?: number[];
  memberVisible?: boolean;
};

export type Ticket = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "open" | "closed";
};
