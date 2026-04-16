import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, Eye, EyeOff, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrength from "@/components/PasswordStrength";
import { validatePassword } from "@/lib/passwordValidation";
import { useI18n } from "@/i18n";
import logoImg from "@/assets/logo.png";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { MAIN_SERVICE_CATEGORIES, SUBCATEGORIES_BY_MAIN, type MainServiceCategory } from "@/data/serviceCategories";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "worker" ? "worker" : "customer";
  const [role, setRole] = useState<"customer" | "worker">(defaultRole);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mainCategory, setMainCategory] = useState<MainServiceCategory | "">("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [willingToDonate, setWillingToDonate] = useState(false);
  const [workerCoords, setWorkerCoords] = useState<Coords | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const handleCaptureWorkerLocation = async () => {
    setCapturingLocation(true);
    try {
      const coords = await getCurrentPosition();
      setWorkerCoords(coords);
      toast.success("Service location saved.");
    } catch {
      toast.error("Please enable location access to continue.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
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
    if (role === "worker" && (!mainCategory || !subCategory || !normalizedExperience)) {
      toast.error("Please select category, subcategory, and experience.");
      return;
    }
    if (role === "worker" && !workerCoords) {
      toast.error("Use your current location as your fixed service location.");
      return;
    }

    setLoading(true);
    const metadata: Record<string, string> = {
      full_name: normalizedName,
      phone: normalizedPhone,
      role,
      blood_group: bloodGroup,
      is_blood_donor: willingToDonate ? "true" : "false",
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
      options: { data: metadata, emailRedirectTo: window.location.origin },
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

    // Supabase quirk: when email confirmations are on, signing up with an
    // existing email returns a "fake" user with empty identities and no session.
    // Detect that and route the user to login instead of pretending it succeeded.
    const identities = (data.user as { identities?: unknown[] } | null)?.identities;
    if (data.user && !data.session && Array.isArray(identities) && identities.length === 0) {
      toast.error("This email is already registered. Please log in instead.");
      navigate(`/login?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }

    if (data.session) {
      toast.success("Account created successfully!");
      navigate(redirect, { replace: true });
      return;
    }
    toast.success("Account created! Check your email to confirm.");
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[hsl(var(--gradient-end))]/5 blur-3xl" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src={logoImg} alt="Near Konnect" className="h-12 object-contain" />
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 shadow-premium">
          <h1 className="text-2xl font-bold text-card-foreground mb-1">{t("register.title")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("register.subtitle")}</p>

          <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl">
            {(["customer", "worker"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  role === r
                    ? "bg-gradient-brand text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                {t(`register.${r}`)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("register.fullName")} *</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" placeholder={t("register.fullName")} className="pl-10" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">{t("register.phone")}</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" placeholder="+92 3XX XXXXXXX" className="pl-10" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">{t("register.email")} *</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="password">{t("register.password")} *</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <select id="bloodGroup" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <input
                type="checkbox"
                id="willingToDonate"
                checked={willingToDonate}
                onChange={e => setWillingToDonate(e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <label htmlFor="willingToDonate" className="text-sm font-medium text-foreground cursor-pointer">
                I am willing to donate blood
              </label>
            </div>

            {role === "worker" && (
              <>
                <div>
                  <Label htmlFor="mainCategory">Main Category *</Label>
                  <select
                    id="mainCategory"
                    value={mainCategory}
                    onChange={(e) => {
                      const nextMainCategory = e.target.value as MainServiceCategory | "";
                      setMainCategory(nextMainCategory);
                      setSubCategory("");
                    }}
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select main category</option>
                    {MAIN_SERVICE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="subCategory">Subcategory *</Label>
                  <select
                    id="subCategory"
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                    disabled={!mainCategory}
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select subcategory</option>
                    {(mainCategory ? SUBCATEGORIES_BY_MAIN[mainCategory] : []).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="experience">{t("register.experience")} *</Label>
                  <Input id="experience" type="number" placeholder="e.g. 5" className="mt-1.5" value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-sm font-medium text-foreground">Use your current location as your service location?</p>
                  <p className="mt-1 text-xs text-muted-foreground">This fixed location is used for nearby matching and cannot be changed frequently.</p>
                  <Button type="button" variant="outline" className="mt-3 w-full gap-2" onClick={handleCaptureWorkerLocation} disabled={capturingLocation || !!workerCoords}>
                    <Navigation className="h-4 w-4" />
                    {workerCoords ? "Service location saved" : capturingLocation ? "Detecting location..." : "Use my current location"}
                  </Button>
                  {workerCoords && (
                    <p className="mt-2 text-xs text-muted-foreground">{workerCoords.latitude.toFixed(5)}, {workerCoords.longitude.toFixed(5)}</p>
                  )}
                </div>
              </>
            )}

            <Button className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-md h-11 rounded-xl font-semibold" type="submit" disabled={loading}>
              {loading ? t("register.submitting") : t("register.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("register.hasAccount")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">{t("nav.logIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;