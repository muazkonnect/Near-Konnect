import type { AuthError } from "@supabase/supabase-js";

export function getAuthErrorMessage(error: unknown): string {
  const message = (error as AuthError | null | undefined)?.message;
  if (!message) return "Something went wrong. Please try again.";

  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Invalid email or password.";
  if (m.includes("email not confirmed")) return "Please verify your email before continuing.";
  if (
    (m.includes("already") && (m.includes("registered") || m.includes("exists"))) ||
    m.includes("user already") ||
    m.includes("duplicate")
  ) {
    return "This email is already registered. Please log in instead.";
  }
  if (m.includes("rate limit")) return "Too many attempts. Please try again shortly.";

  return message;
}

