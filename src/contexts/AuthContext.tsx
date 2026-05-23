import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { parseContactMethods } from "@/lib/contactMethods";

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n", ""].includes(v)) return false;
  }
  return false;
};

const toNumberOrNull = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightEnsuresRef = useRef<Map<string, Promise<void>>>(new Map());

  const ensureUserRecords = async (nextUser: User | null) => {
    if (!nextUser) return;

    const existing = inFlightEnsuresRef.current.get(nextUser.id);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      const md = nextUser.user_metadata || {};
      const fullName = String(md.full_name || "").trim();
      const phone = String(md.phone || "").trim();
      const role = md.role === "worker" ? "worker" : "customer";
      const bloodGroup = String(md.blood_group || "").trim() || null;
      const isBloodDonor = toBoolean(md.is_blood_donor);
      const useWhatsapp = toBoolean(md.use_whatsapp);
      let contactMethods: { type: string; value: string }[] = [];
      try {
        const raw = md.contact_methods;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        contactMethods = parseContactMethods(parsed);
      } catch {
        contactMethods = [];
      }
      const rawMainCategory = String(md.main_category || "").trim();
      const rawSubCategory = String(md.sub_category || "").trim();

      // Trust whatever the user picked in the signup form (categories come from the
      // admin-managed `service_categories` table, not a hardcoded list).
      const mainCategory = rawMainCategory || null;
      const subCategory = rawSubCategory || null;

      // Check if profile already exists — if so, do NOT overwrite user-edited fields
      // like contact_methods, phone, blood_group, etc. Only seed them on first creation.
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", nextUser.id)
        .maybeSingle();
      if (existingProfileError) throw existingProfileError;

      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: nextUser.id,
          full_name: fullName || nextUser.email?.split("@")[0] || "Near Konnect User",
          blood_group: bloodGroup,
          is_blood_donor: isBloodDonor,
          use_whatsapp: useWhatsapp,
          contact_methods: contactMethods,
        } as any);
        if (profileError && !String(profileError.message).toLowerCase().includes("duplicate")) {
          throw profileError;
        }
        if (phone) {
          await supabase.from("profile_phones").upsert({ user_id: nextUser.id, phone } as any, { onConflict: "user_id" });
        }
      }

      // Fetch ALL existing roles for this user — needed to detect staff accounts
      // (admin/manager/ads_manager/moderator) which must never be inserted as workers.
      const { data: allRoles, error: allRolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", nextUser.id);
      if (allRolesError) throw allRolesError;
      const roleSet = new Set((allRoles ?? []).map((r: any) => r.role));
      const STAFF_ROLES = ["admin", "manager", "ads_manager", "moderator"];
      const isStaff = STAFF_ROLES.some((r) => roleSet.has(r));

      if (!roleSet.has(role) && !isStaff) {
        const { error: insertRoleError } = await supabase.from("user_roles").insert({ user_id: nextUser.id, role });
        if (insertRoleError && !String(insertRoleError.message).toLowerCase().includes("duplicate")) {
          throw insertRoleError;
        }
      }

      if (role === "worker" && !isStaff) {
        const lat = toNumberOrNull(md.latitude);
        const lng = toNumberOrNull(md.longitude);

        // Use the actual selected sub-category or fallback to metadata profession,
        // only using "General Service" as a last resort.
        const workerProfession = subCategory || String(md.profession || "").trim() || "General Service";

        // Check if worker row already exists — the location is locked after creation,
        // so re-running an upsert with lat/lng would trip the immutability trigger.
        const { data: existingWorker } = await supabase
          .from("workers")
          .select("id")
          .eq("user_id", nextUser.id)
          .maybeSingle();

        if (!existingWorker) {
          const { error: workerError } = await supabase.from("workers").insert({
            user_id: nextUser.id,
            profession: workerProfession,
            main_category: mainCategory,
            sub_category: subCategory,
            experience: Math.max(0, parseInt(String(md.experience || "0"), 10) || 0),
            available: true,
            latitude: lat,
            longitude: lng,
            service_areas: [],
            city: null,
          } as any);
          if (workerError && !String(workerError.message).toLowerCase().includes("duplicate")) {
            throw workerError;
          }

          if (lat !== null && lng !== null) {
            const { error: locError } = await (supabase.rpc as any)("set_worker_location", { lat, lng });
            if (locError) console.warn("Failed to set workplace_location", locError);
          }
        }
      }
    })().catch((error) => {
      console.error("Failed to ensure user records", error);
    });

    inFlightEnsuresRef.current.set(nextUser.id, task);
    try {
      await task;
    } finally {
      inFlightEnsuresRef.current.delete(nextUser.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Single source of truth for initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void ensureUserRecords(session.user);
          void (supabase.rpc as any)("worker_mark_active").then(() => {});
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initAuth();

    // 2. Listen for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void ensureUserRecords(session.user);
          // Mark worker as active — re-enables auto-disabled accounts on login
          void (supabase.rpc as any)("worker_mark_active").then(() => {});
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
