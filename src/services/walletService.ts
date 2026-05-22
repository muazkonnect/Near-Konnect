import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type WalletRow = {
  owner_user_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  owner_user_id: string;
  delta: number;
  reason: string;
  notes: string | null;
  status: string;
  payment_method: string | null;
  payment_request_id: string | null;
  campaign_id: string | null;
  created_at: string;
};

export type SparksPackage = {
  id: string;
  name: string;
  sparks: number;
  bonus_sparks: number;
  price_pkr: number;
  price_usdt: number;
  is_active: boolean;
  sort_order: number;
};

export type PaymentSettings = {
  easypaisa_number: string;
  easypaisa_account_name: string;
  easypaisa_qr_url: string;
  jazzcash_number: string;
  jazzcash_account_name: string;
  jazzcash_qr_url: string;
  usdt_address: string;
  usdt_network: string;
  usdt_qr_url: string;
  usdt_address_trc: string;
  usdt_address_bep: string;
  usdt_address_erc: string;
  usdt_qr_trc_url: string;
  usdt_qr_bep_url: string;
  usdt_qr_erc_url: string;
  instructions: string;
};

export type PaymentRequest = {
  id: string;
  user_id: string;
  package_id: string | null;
  sparks_amount: number;
  bonus_sparks: number;
  price_amount: number;
  currency: string;
  payment_method: "easypaisa" | "jazzcash" | "usdt";
  reference: string;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  admin_note: string;
  decided_at: string | null;
  created_at: string;
};

export async function fetchWallet(userId: string): Promise<WalletRow | null> {
  const { data, error } = await sb
    .from("sparks_wallets")
    .select("owner_user_id, balance, total_purchased, total_spent, updated_at")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTransactions(userId: string, limit = 100): Promise<TransactionRow[]> {
  const { data, error } = await sb
    .from("sparks_transactions")
    .select("id, owner_user_id, delta, reason, notes, status, payment_method, payment_request_id, campaign_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchPackages(): Promise<SparksPackage[]> {
  const { data, error } = await sb
    .from("sparks_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchPackageById(id: string): Promise<SparksPackage | null> {
  const { data, error } = await sb.from("sparks_packages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
  const { data, error } = await sb.from("payment_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function spendSparks(amount: number, reason = "ad_spent", notes?: string, campaignId?: string) {
  const { data, error } = await sb.rpc("spend_sparks", {
    p_amount: amount,
    p_reason: reason,
    p_notes: notes ?? null,
    p_campaign_id: campaignId ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function uploadPaymentProof(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("payment-proofs").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getProofSignedUrl(path: string, expiresIn = 60 * 10): Promise<string | null> {
  const { data, error } = await sb.storage.from("payment-proofs").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function createPaymentRequest(input: {
  userId: string;
  packageId?: string | null;
  sparks: number;
  bonusSparks: number;
  priceAmount: number;
  currency: string;
  method: "easypaisa" | "jazzcash" | "usdt";
  reference: string;
  proofUrl: string | null;
}): Promise<PaymentRequest> {
  const { data, error } = await sb
    .from("payment_requests")
    .insert({
      user_id: input.userId,
      package_id: input.packageId ?? null,
      sparks_amount: input.sparks,
      bonus_sparks: input.bonusSparks,
      price_amount: input.priceAmount,
      currency: input.currency,
      payment_method: input.method,
      reference: input.reference,
      proof_url: input.proofUrl,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPaymentRequest(id: string): Promise<PaymentRequest | null> {
  const { data, error } = await sb.from("payment_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
  const { data, error } = await sb
    .from("payment_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Admin
export async function adminFetchPendingPayments(): Promise<PaymentRequest[]> {
  const { data, error } = await sb
    .from("payment_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function adminApprovePayment(id: string, note = "") {
  const { error } = await sb.rpc("approve_payment_request", { p_id: id, p_note: note });
  if (error) throw error;
}

export async function adminRejectPayment(id: string, note = "") {
  const { error } = await sb.rpc("reject_payment_request", { p_id: id, p_note: note });
  if (error) throw error;
}

export async function adminCreditSparks(userId: string, amount: number, reason = "admin_added", notes?: string) {
  const { error } = await sb.rpc("admin_credit_sparks", {
    p_user: userId, p_amount: amount, p_reason: reason, p_notes: notes ?? null,
  });
  if (error) throw error;
}

export async function adminDebitSparks(userId: string, amount: number, reason = "deduction", notes?: string) {
  const { error } = await sb.rpc("admin_debit_sparks", {
    p_user: userId, p_amount: amount, p_reason: reason, p_notes: notes ?? null,
  });
  if (error) throw error;
}

export async function adminUpdatePaymentSettings(patch: Partial<PaymentSettings>) {
  const { error } = await sb.from("payment_settings").update(patch).eq("id", 1);
  if (error) throw error;
}

export async function adminUpsertPackage(pkg: Partial<SparksPackage> & { id?: string }) {
  if (pkg.id) {
    const { error } = await sb.from("sparks_packages").update(pkg).eq("id", pkg.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("sparks_packages").insert(pkg);
    if (error) throw error;
  }
}

export async function adminDeletePackage(id: string) {
  const { error } = await sb.from("sparks_packages").delete().eq("id", id);
  if (error) throw error;
}

export async function adminFetchAllPackages(): Promise<SparksPackage[]> {
  const { data, error } = await sb.from("sparks_packages").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}
