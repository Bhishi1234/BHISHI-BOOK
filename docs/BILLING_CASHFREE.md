# Cashfree Subscriptions (Bhishi Book)

Webhook-driven billing. The success page only polls status — plans are activated when Cashfree hits our webhook.

## Prices

| Plan | Monthly | Yearly |
|------|---------|--------|
| Pro | ₹199 | ₹1,999 |
| Power | ₹499 | ₹4,999 |

## 1. Create Cashfree plans

In Cashfree dashboard (Subscriptions → Plans), create **four periodic plans** with those amounts. Copy each `plan_id`.

## 2. Supabase secrets

```bash
supabase secrets set \
  CASHFREE_APP_ID=your_app_id \
  CASHFREE_SECRET_KEY=your_secret_key \
  CASHFREE_ENV=sandbox \
  CASHFREE_WEBHOOK_SECRET=your_secret_key \
  CASHFREE_PLAN_PRO_MONTH=plan_xxx \
  CASHFREE_PLAN_PRO_YEAR=plan_xxx \
  CASHFREE_PLAN_POWER_MONTH=plan_xxx \
  CASHFREE_PLAN_POWER_YEAR=plan_xxx \
  SITE_URL=https://your-app.vercel.app \
  SUPABASE_URL=https://xxxx.supabase.co \
  SUPABASE_ANON_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=...
```

Use `CASHFREE_ENV=production` for live.

**Do not paste keys into chat or commit them.**

## 3. Deploy Edge Functions

```bash
supabase functions deploy billing-create-subscription
supabase functions deploy cashfree-webhook
supabase functions deploy billing-status
supabase functions deploy billing-cancel
```

## 4. Webhook URL (Cashfree dashboard)

`https://<project-ref>.supabase.co/functions/v1/cashfree-webhook`

Subscribe at least to:

- `SUBSCRIPTION_STATUS_CHANGED`
- `SUBSCRIPTION_AUTH_STATUS`
- `SUBSCRIPTION_PAYMENT_SUCCESS`
- `SUBSCRIPTION_PAYMENT_FAILED`
- `SUBSCRIPTION_PAYMENT_CANCELLED`

## 5. Apply DB migration

Run in Supabase SQL editor (or CLI):

`supabase/migrations/20260921400000_cashfree_billing.sql`

This:

- Adds `billing_subscriptions`, `billing_events`, `plan_expires_at`
- Stops client `set_plan('pro'|'power')` free upgrades
- Activates plans only via service-role `activate_subscription_plan`

## 6. App flow

1. User taps **Subscribe** on Upgrade → `billing-create-subscription`
2. Cashfree JS opens subscription checkout (`subscription_session_id`)
3. User authorises → return to `/billing/success?sub_id=…`
4. Page polls `billing-status` until webhook has set plan + `plan_expires_at`
5. Recurring charges extend the period on each `SUBSCRIPTION_PAYMENT_SUCCESS`

## 7. Return URL

Configured automatically as `{SITE_URL}/billing/success?sub_id={merchantSubscriptionId}`.

## Local mock

Without Supabase env, Upgrade still calls mock `setPlan` for UI demos only.
