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
  { id: "auction", label: "Auction bhishi" },
  { id: "fixed", label: "Fixed / committee" },
  { id: "base_premium", label: "Base + premium" },
  { id: "loan", label: "Loan bhishi" },
] as const;

export const META_FREQUENCIES = [
  { id: "daily", label: "Daily hapta" },
  { id: "weekly", label: "Weekly hapta" },
  { id: "biweekly", label: "Every 15 days" },
  { id: "monthly", label: "Monthly hapta" },
  { id: "quarterly", label: "Every 3 months" },
  { id: "halfyearly", label: "Every 6 months" },
  { id: "yearly", label: "Yearly hapta" },
] as const;
