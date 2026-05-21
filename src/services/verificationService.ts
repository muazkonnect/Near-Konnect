import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;

export type WorkerVerification = {
  id: string;
  worker_id: string;
  user_id: string;
  status: "none" | "submitted" | "approved" | "rejected" | "resubmit";
  persona_inquiry_id: string | null;
  persona_session_token: string | null;
  persona_status: string | null;
  sparks_cost: number;
  admin_note: string;
  verified_at: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationSettings = {
  id: number;
  sparks_cost: number;
  persona_template_id: string;
  persona_environment_id: string;
  enabled: boolean;
  auto_approve_on_persona_pass: boolean;
};

export async function fetchVerificationSettings(): Promise<VerificationSettings | null> {
  const { data, error } = await sb.from("verification_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateVerificationSettings(patch: Partial<VerificationSettings>) {
  const { error } = await sb.from("verification_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

export async function fetchMyVerification(): Promise<WorkerVerification | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from("worker_verifications").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function startVerification(): Promise<WorkerVerification> {
  const { data, error } = await sb.rpc("start_verification");
  if (error) throw error;
  return data as WorkerVerification;
}

export async function createPersonaInquiry(): Promise<{ demo: boolean; inquiry_id: string; session_token: string | null; template_id: string }> {
  const { data, error } = await supabase.functions.invoke("persona-create-inquiry");
  if (error) throw error;
  return data as any;
}

export async function createDiditSession(): Promise<{ session_id: string; session_token: string | null; url: string; status: string }> {
  const { data, error } = await supabase.functions.invoke("didit-create-session");
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function getDiditDecision(session_id: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("didit-get-decision", { body: { session_id } });
  if (error) throw error;
  return data;
}

export async function fetchDiditEvidence(session_id: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("didit-fetch-evidence", { body: { session_id } });
  if (error) throw error;
  return data;
}

export async function submitVerification(inquiryId: string, sessionToken?: string | null): Promise<WorkerVerification> {
  const { data, error } = await sb.rpc("submit_verification", { p_inquiry_id: inquiryId, p_session_token: sessionToken ?? null });
  if (error) throw error;
  return data as WorkerVerification;
}

export async function adminFetchVerifications(): Promise<WorkerVerification[]> {
  const { data, error } = await sb.from("worker_verifications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminDecideVerification(id: string, status: "approved" | "rejected" | "resubmit", note = "") {
  const { error } = await sb.rpc("admin_decide_verification", { p_id: id, p_status: status, p_note: note });
  if (error) throw error;
}

export async function adminRevokeVerification(workerId: string, note = "") {
  const { error } = await sb.rpc("admin_revoke_verification", { p_worker_id: workerId, p_note: note });
  if (error) throw error;
}

export async function uploadVerificationDoc(userId: string, file: File, kind: "id_front" | "id_back" | "selfie" | "other"): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("verification-docs").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getVerificationDocSignedUrl(path: string, expiresIn = 600): Promise<string | null> {
  const { data, error } = await sb.storage.from("verification-docs").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
