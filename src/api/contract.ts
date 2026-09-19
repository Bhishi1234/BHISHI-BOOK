/** Public HTTP surface used by the web app and the future Play Store client. */
export const API_ROUTES = {
  health: "GET /api/v1/health",
  types: "GET /api/v1/meta/types",
  frequencies: "GET /api/v1/meta/frequencies",
  signUp: "POST /api/v1/auth/sign-up",
  signIn: "POST /api/v1/auth/sign-in",
  sendOtp: "POST /api/v1/auth/send-otp",
  verifyOtp: "POST /api/v1/auth/verify-otp",
  logout: "POST /api/v1/auth/logout",
  me: "GET /api/v1/me",
  updateMe: "PATCH /api/v1/me",
  setPlan: "POST /api/v1/me/plan",
  deactivate: "POST /api/v1/me/deactivate",
  customers: "GET /api/v1/customers",
  addCustomer: "POST /api/v1/customers",
  chits: "GET /api/v1/chits",
  chit: "GET /api/v1/chits/:id",
  createChit: "POST /api/v1/chits",
  cancelChit: "POST /api/v1/chits/:id/cancel",
  addMember: "POST /api/v1/chits/:id/members",
  settings: "POST /api/v1/chits/:id/settings",
  closeCycle: "POST /api/v1/chits/:id/close-cycle",
  recordPayment: "POST /api/v1/chits/:id/payments",
  undoPayment: "DELETE /api/v1/chits/:id/payments/:paymentId",
  settle: "POST /api/v1/chits/:id/settle",
  luckyDraw: "POST /api/v1/chits/:id/lucky-draw",
  tickets: "GET /api/v1/tickets",
  addTicket: "POST /api/v1/tickets",
} as const;

export const META_TYPES = [
  { id: "auction", label: "Auction chit" },
  { id: "fixed", label: "Fixed & committee" },
  { id: "loan", label: "Loan chit" },
] as const;

export const META_FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Bi Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "halfyearly", label: "Half Yearly" },
  { id: "yearly", label: "Yearly" },
] as const;
