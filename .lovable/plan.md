## Sparks Wallet System — Implementation Plan

A full wallet, transactions, buy flow, payment-method routing (Pakistan vs international), admin approval, and admin manual controls. Built on the existing `sparks_wallets` / `sparks_transactions` tables, extending with the missing pieces.

---

### 1. Database (migration)

Extend / add tables. All with RLS.

- `sparks_wallets` (exists) — add columns: `total_purchased int default 0`, `total_spent int default 0`. Add unique index on `owner_user_id`. Auto-create on signup via trigger on `auth.users`.
- `sparks_transactions` (exists) — extend enum `reason` to include: `purchase`, `admin_added`, `ad_spent`, `refund`, `bonus`, `deduction`. Add `status text default 'completed'`, `payment_method text`, `payment_request_id uuid`. Insert via SECURITY DEFINER functions only.
- **NEW** `payment_requests` — `id`, `user_id`, `package_id`, `sparks_amount int`, `price_amount numeric`, `currency text`, `payment_method text` (easypaisa/jazzcash/usdt), `reference text` (txn id / hash), `proof_url text`, `status text` (pending/approved/rejected), `admin_note text`, `decided_by`, `decided_at`, `created_at`.
- **NEW** `sparks_packages` — `id`, `name`, `sparks int`, `price_pkr numeric`, `price_usdt numeric`, `is_active bool`, `sort_order`, `bonus_sparks int default 0`.
- **NEW** `payment_settings` — single-row config: `easypaisa_number`, `easypaisa_account_name`, `jazzcash_number`, `jazzcash_account_name`, `usdt_address`, `usdt_network`, `usdt_qr_url`, `easypaisa_qr_url`, `jazzcash_qr_url`, `updated_by`, `updated_at`.
- **NEW** storage bucket `payment-proofs` (private). RLS: user uploads own, admin reads all.

**SECURITY DEFINER RPCs** (the only way to mutate wallet balance):
- `spend_sparks(p_amount int, p_reason text, p_notes text, p_campaign_id uuid)` — deducts from caller, inserts transaction, returns new balance. Errors if insufficient.
- `admin_credit_sparks(p_user uuid, p_amount int, p_reason text, p_notes text)` — admin only.
- `admin_debit_sparks(p_user uuid, p_amount int, p_reason text, p_notes text)` — admin only.
- `approve_payment_request(p_id uuid, p_note text)` — admin only; credits sparks, updates request, logs transaction with `payment_request_id`.
- `reject_payment_request(p_id uuid, p_note text)` — admin only.
- Trigger `on_auth_user_created_wallet` ensures a wallet row exists.

RLS summary:
- `sparks_wallets`: select own + admin. No direct insert/update from clients.
- `sparks_transactions`: select own + admin. No client insert.
- `payment_requests`: user select/insert own (status='pending'); admin all.
- `sparks_packages`, `payment_settings`: public select (active/single); admin manage.

---

### 2. Frontend architecture

```
src/
  contexts/WalletContext.tsx        # global balance + realtime subscription
  hooks/
    useWallet.ts                    # balance, totals, history, refresh
    usePaymentSettings.ts
    useSparksPackages.ts
  services/walletService.ts         # all supabase calls (spend, buy, fetch)
  components/wallet/
    SparksBalanceChip.tsx           # navbar/header pill
    SparksBalanceCard.tsx           # dashboard hero card
    PackageCard.tsx
    PaymentMethodSelector.tsx       # routes by country
    EasypaisaJazzcashForm.tsx
    UsdtPaymentForm.tsx
    ProofUploader.tsx
    TransactionRow.tsx
    TransactionsTable.tsx
  pages/wallet/
    WalletPage.tsx                  # /wallet — balance + history
    BuySparksPage.tsx               # /wallet/buy
    PaymentCheckoutPage.tsx         # /wallet/buy/:packageId/checkout
    PaymentStatusPage.tsx           # /wallet/payment/:id
  components/admin/
    SparksAdminTab.tsx              # extend existing
      - PendingPaymentsPanel
      - ManualSparksPanel
      - PaymentSettingsPanel
      - PackagesPanel
      - AllTransactionsPanel
```

- Country detection: reuse existing geolocation/profile city, plus a `country` field on profile if available; otherwise fall back to a simple selector at checkout (default Pakistan if city matches PK list, else international). Keep a single util `getUserPaymentRegion()`.
- Routes added to `App.tsx`. Lazy-loaded with `React.lazy`. Wallet routes protected via existing `ProtectedRoute`. Admin panels gated by `useUserRole`.
- `WalletContext` exposes `{ balance, totalPurchased, totalSpent, refresh, spend }` and subscribes to `sparks_wallets` realtime changes.
- `SparksBalanceChip` rendered in `AppLayout` header (next to NotificationBell) and in Ads Dashboard / Worker Dashboard.

---

### 3. Buy Sparks flow

1. `/wallet/buy` — grid of `PackageCard`s + "Custom amount" card.
2. Selecting a package → `/wallet/buy/:id/checkout`.
3. `PaymentMethodSelector` shows:
   - PK users: Easypaisa, JazzCash tabs — show account number/name + QR (from `payment_settings`), reference input, proof upload.
   - International: USDT tab — show address + QR + network, txn hash input, proof upload.
4. Submit → insert `payment_requests` (status `pending`) + upload proof to `payment-proofs/{user}/{uuid}`.
5. Redirect to `/wallet/payment/:id` showing pending state. Polls/realtime updates.

---

### 4. Admin

Extend `SparksAdminTab.tsx`:
- **Pending Payments**: list with proof preview, approve (calls `approve_payment_request`) / reject with note.
- **Manual Sparks**: search user → credit / debit with reason. Calls admin RPCs.
- **Packages**: CRUD on `sparks_packages`.
- **Payment Settings**: edit Easypaisa, JazzCash, USDT details + upload QR images.
- **All Transactions**: filterable table.

---

### 5. Spending integration

Replace any existing direct balance writes in the Ads flow with `walletService.spend(amount, 'ad_spent', notes, campaignId)` calling `spend_sparks` RPC. Insufficient balance triggers a "Top up Sparks" CTA → `/wallet/buy`.

---

### 6. UI

Premium fintech feel: gradient hero balance card with animated count, soft shadows, semantic tokens from `index.css`, framer-motion micro-animations, mobile-first layouts mirroring existing AppLayout style.

---

### Order of execution

1. Migration (tables, enums, RPCs, trigger, storage bucket, RLS, seed packages + settings row).
2. Wallet service + context + hooks.
3. Wallet pages (Wallet, BuySparks, Checkout, Status) + components.
4. Header `SparksBalanceChip` in `AppLayout`.
5. Admin panels.
6. Wire Ads spending to RPC.
7. Register routes in `App.tsx`.