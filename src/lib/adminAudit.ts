import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Log an admin action to the admin_audit_log table.
 * Failure is non-fatal (we never want a logging error to break the UI flow).
 */
export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await sb.from("admin_audit_log").insert({
      admin_user_id: params.adminUserId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.warn("admin audit log failed", err);
  }
}
