import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import MapLocationPicker from "@/components/MapLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrength from "@/components/PasswordStrength";
import { validatePassword } from "@/lib/passwordValidation";
import { useI18n } from "@/i18n";
import { type Coords } from "@/lib/geolocation";
import { MAIN_SERVICE_CATEGORIES, SUBCATEGORIES_BY_MAIN, type MainServiceCategory } from "@/data/serviceCategories";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import AuthShell from "@/components/AuthShell";
import AuthTabs from "@/components/AuthTabs";
import ContactMethodsEditor from "@/components/ContactMethodsEditor";
import FaceVerification from "@/components/FaceVerification";
import { type ContactMethod, validateContactMethods, sanitizePhone, normalizeContactMethods } from "@/lib/contactMethods";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "worker" ? "worker" : "customer";
  const [role, setRole] = useState<"customer" | "worker">(defaultRole);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [postSignupRedirect, setPostSignupRedirect] = useState<string>("/");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mainCategory, setMainCategory] = useState<MainServiceCategory | "">("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [willingToDonate, setWillingToDonate] = useState(false);
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([{ type: "phone", value: "" }]);
  const [workerCoords, setWorkerCoords] = useState<Coords | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const phoneEntry = contactMethods.find((m) => m.type === "phone");
  const phone = phoneEntry?.value ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = sanitizePhone(phone);
    const normalizedExperience = experience.trim();

    if (!normalizedName || !normalizedEmail || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) {
      toast.error("Password doesn't meet requirements: " + pwValidation.errors[0]);
      return;
    }
    if (!normalizedPhone) {
      toast.error("A phone number is required.");
      return;
    }
    // Normalise every contact method (phones → E.164 no spaces; others → no internal whitespace)
    const trimmedMethods: ContactMethod[] = normalizeContactMethods(contactMethods);
    const contactErr = validateContactMethods(trimmedMethods);
    if (contactErr) {
      toast.error(contactErr);
      return;
    }
    if (role === "worker" && (!mainCategory || !subCategory || !normalizedExperience)) {
      toast.error("Please select category, subcategory, and experience.");
      return;
    }
    if (role === "worker" && !workerCoords) {
      toast.error("Please pick your fixed service location on the map.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    const hasWhatsapp = trimmedMethods.some((m) => m.type === "whatsapp" && m.value);
    const metadata: Record<string, string> = {
      full_name: normalizedName,
      phone: normalizedPhone,
      role,
      blood_group: bloodGroup,
      is_blood_donor: willingToDonate ? "true" : "false",
      use_whatsapp: hasWhatsapp ? "true" : "false",
      contact_methods: JSON.stringify(trimmedMethods),
    };
    if (role === "worker") {
      metadata.main_category = mainCategory;
      metadata.sub_category = subCategory;
      metadata.profession = subCategory;
      metadata.experience = normalizedExperience;
      metadata.latitude = String(workerCoords?.latitude ?? "");
      metadata.longitude = String(workerCoords?.longitude ?? "");
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: metadata },
    });

    setLoading(false);
    if (error) {
      const msg = getAuthErrorMessage(error);
      toast.error(msg);
      if (/already registered|already exists|log in instead/i.test(msg)) {
        navigate(`/login?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
      }
      return;
    }
    const defaultRedirect = role === "worker" ? "/worker-dashboard" : "/dashboard";
    const redirect = searchParams.get("redirect") || defaultRedirect;

    const identities = (data.user as { identities?: unknown[] } | null)?.identities;
    if (data.user && !data.session && Array.isArray(identities) && identities.length === 0) {
      toast.error("This email is already registered. Please log in instead.");
      navigate(`/login?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }

    if (data.session) {
      toast.success("Account created! One more step: verify your face.");
      setPostSignupRedirect(redirect);
      setVerifyingFace(true);
      return;
    }
    toast.success("An 8-digit OTP has been sent to your email.");
    navigate(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirect)}`, { replace: true });
  };

  const handleFaceVerified = () => {
    toast.success("Identity verified!");
    navigate(postSignupRedirect, { replace: true });
  };

  const handleFaceSkip = async () => {
    await supabase.auth.signOut();
    setVerifyingFace(false);
    toast.message("Signed out. Please register again to complete verification.");
  };

  const inputClass = "h-12 rounded-2xl border-border bg-background text-base";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <AuthShell
      title={t("register.title")}
      subtitle={t("register.subtitle")}
      heroExtra={
        <div className="space-y-3">
          <AuthTabs active="register" />
          <div className="grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1">
            {(["customer", "worker"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-full py-2 text-xs font-semibold transition ${
                  role === r ? "bg-white text-hero shadow-sm" : "text-hero-muted"
                }`}
              >
                {t(`register.${r}`)}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="name" className={labelClass}>{t("register.fullName")} *</Label>
          <Input id="name" placeholder={t("register.fullName")} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <Label className={labelClass}>Contact options *</Label>
          <p className="mb-2 text-xs text-muted-foreground">Phone is required. Add any other apps you use so customers can reach you.</p>
          <ContactMethodsEditor value={contactMethods} onChange={setContactMethods} requirePhone />
        </div>
        <div>
          <Label htmlFor="email" className={labelClass}>{t("register.email")} *</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="password" className={labelClass}>{t("register.password")} *</Label>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Toggle password">
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div>
          <Label htmlFor="bloodGroup" className={labelClass}>Blood Group</Label>
          <select id="bloodGroup" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Select blood group</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <label htmlFor="willingToDonate" className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3.5 text-sm font-medium">
          <input
            type="checkbox"
            id="willingToDonate"
            checked={willingToDonate}
            onChange={e => setWillingToDonate(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          I am willing to donate blood
        </label>

        {role === "worker" && (
          <>
            <div>
              <Label htmlFor="mainCategory" className={labelClass}>Main Category *</Label>
              <select
                id="mainCategory"
                value={mainCategory}
                onChange={(e) => {
                  const next = e.target.value as MainServiceCategory | "";
                  setMainCategory(next);
                  setSubCategory("");
                }}
                className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select main category</option>
                {MAIN_SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subCategory" className={labelClass}>Subcategory *</Label>
              <select
                id="subCategory"
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                disabled={!mainCategory}
                className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-base disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select subcategory</option>
                {(mainCategory ? SUBCATEGORIES_BY_MAIN[mainCategory] : []).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="experience" className={labelClass}>{t("register.experience")} *</Label>
              <Input id="experience" type="number" placeholder="e.g. 5" value={experience} onChange={e => setExperience(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-foreground">Pick your fixed service location *</p>
              <p className="text-xs text-muted-foreground">Used for nearby matching. Cannot be changed frequently.</p>
              <MapLocationPicker value={workerCoords} onChange={setWorkerCoords} />
            </div>
          </>
        )}

        <div className="space-y-3 rounded-2xl border border-primary/30 bg-accent/40 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Platform Role — Communication Only</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              NearKonnect serves <strong>solely as a communication platform</strong> connecting customers with service workers.
              We are <strong>not responsible</strong> for the quality, timing, or outcome of any work, payments, agreements, damages,
              injuries, or disputes between parties. All dealings happen at your own risk.
            </p>
          </div>
          <label htmlFor="agreeTerms" className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-foreground">
              I have read and agree to the{" "}
              <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">
                Terms & Conditions
              </Link>
              ,{" "}
              <Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/disclaimer" target="_blank" className="font-semibold text-primary hover:underline">
                Disclaimer
              </Link>
              .
            </span>
          </label>
        </div>

        <Button type="submit" disabled={loading || !agreedToTerms} variant="hero" size="lg" className="w-full">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("register.submitting")}
            </>
          ) : (
            t("register.submit")
          )}
        </Button>
      </form>

      <SocialAuthButtons disabled={loading} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link to="/login" className="font-semibold text-foreground hover:underline">{t("nav.logIn")}</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
