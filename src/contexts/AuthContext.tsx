import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { isValidMainCategory, isValidSubcategoryForMain } from "@/data/serviceCategories";
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

      const mainCategory = isValidMainCategory(rawMainCategory) ? rawMainCategory : null;
      const subCategory =
        mainCategory && isValidSubcategoryForMain(mainCategory, rawSubCategory)
          ? rawSubCategory
          : null;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: nextUser.id,
          full_name: fullName || nextUser.email?.split("@")[0] || "NearKonnect User",
          phone: phone || null,
          blood_group: bloodGroup,
          is_blood_donor: isBloodDonor,
          use_whatsapp: useWhatsapp,
          contact_methods: contactMethods,
        } as any,
        { onConflict: "user_id" }
      );
      if (profileError) throw profileError;

      const { data: existingRole, error: existingRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", nextUser.id)
        .eq("role", role)
        .maybeSingle();
      if (existingRoleError) throw existingRoleError;

      if (!existingRole) {
        const { error: insertRoleError } = await supabase.from("user_roles").insert({ user_id: nextUser.id, role });
        // Ignore uniqueness races (UNIQUE(user_id, role))
        if (insertRoleError && !String(insertRoleError.message).toLowerCase().includes("duplicate")) {
          throw insertRoleError;
        }
      }

      if (role === "worker") {
        const lat = toNumberOrNull(md.latitude);
        const lng = toNumberOrNull(md.longitude);
        const { error: workerError } = await supabase.from("workers").upsert(
          {
            user_id: nextUser.id,
            profession: subCategory || "General Service",
            main_category: mainCategory,
            sub_category: subCategory,
            experience: Math.max(0, parseInt(String(md.experience || "0"), 10) || 0),
            available: true,
            latitude: lat,
            longitude: lng,
            service_areas: [],
            city: null,
          },
          { onConflict: "user_id" }
        );
        if (workerError) throw workerError;

        if (lat !== null && lng !== null) {
          const { error: locError } = await (supabase.rpc as any)("set_worker_location", { lat, lng });
          if (locError) console.warn("Failed to set workplace_location", locError);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void ensureUserRecords(session.user);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void ensureUserRecords(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
