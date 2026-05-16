import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrength from "@/components/PasswordStrength";
import { validatePassword } from "@/lib/passwordValidation";
import { useCategories } from "@/hooks/useCategories";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import { sanitizePhone } from "@/lib/contactMethods";
import logoImg from "@/assets/logo.svg";
import FaceVerification from "@/components/FaceVerification";
import PhoneField from "@/components/PhoneField";
import { useDetectedCountry } from "@/hooks/useDetectedCountry";
import { isValidPhoneNumber } from "libphonenumber-js";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EXPERTISE_SUGGESTIONS: Record<string, string[]> = {
  default: ["Residential", "Commercial", "Emergency", "Maintenance"],
};

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mainCategories, getSubCategories } = useCategories();
  const defaultRole = searchParams.get("role") === "worker" ? "worker" : "customer";
  const detectedCountry = useDetectedCountry();
  const [role, setRole] = useState<"customer" | "worker">(defaultRole);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const [isBloodDonor, setIsBloodDonor] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [existingAccountModal, setExistingAccountModal] = useState<{ open: boolean; email: string }>({ open: false, email: "" });
  const [faceDataUrl, setFaceDataUrl] = useState<string | null>(null);
  const [faceBlob, setFaceBlob] = useState<Blob | null>(null);

  const subCategories = mainCategory ? getSubCategories(mainCategory) : [];
  const expertiseChips = EXPERTISE_SUGGESTIONS[subCategory] || EXPERTISE_SUGGESTIONS.default;

  const toggleTag = (tag: string) => {
    setExpertiseTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !expertiseTags.includes(t)) setExpertiseTags([...expertiseTags, t]);
    setCustomTag("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = sanitizePhone(phone);

    if (!normalizedName || !normalizedEmail || !password || !normalizedPhone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast.error("Please enter a valid phone number with country code.");
      return;
    }
    const pw = validatePassword(password);
    if (!pw.isValid) {
      toast.error("Password: " + pw.errors[0]);
      return;
    }
    if (role === "worker" && (!mainCategory || !subCategory || !experience.trim())) {
      toast.error("Please complete category, sub-category and experience.");
      return;
    }
    if (isBloodDonor && !bloodGroup) {
      toast.error("Please select your blood type.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms & Privacy Policy.");
      return;
    }
    if (!faceDataUrl) {
      toast.error("Please complete face verification first.");
      return;
    }

    setLoading(true);
    try {
      const { data: phoneTaken } = await (supabase.rpc as any)("phone_exists", { _phone: normalizedPhone });
      if (phoneTaken) {
        setLoading(false);
        if (role === "worker") {
          setExistingAccountModal({ open: true, email: normalizedEmail });
        } else {
          toast.error("Account already exists, please login");
          navigate(`/login?redirect=${encodeURIComponent("/dashboard")}`, { replace: true });
        }
        return;
      }

      const metadata: Record<string, string> = {
        full_name: normalizedName,
        phone: normalizedPhone,
        role,
        is_blood_donor: isBloodDonor ? "true" : "false",
        blood_group: isBloodDonor ? bloodGroup : "",
        contact_methods: JSON.stringify([{ type: "phone", value: normalizedPhone }]),
      };
      if (role === "worker") {
        metadata.main_category = mainCategory;
        metadata.sub_category = subCategory;
        metadata.profession = subCategory;
        metadata.experience = experience.trim();
        metadata.expertise_tags = JSON.stringify(expertiseTags);
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: metadata },
      });

      // Upload verified face as permanent, unchangeable avatar — block until done
      if (data?.user && faceDataUrl) {
        try {
          const { error: avatarErr } = await supabase.functions.invoke(
            "set-verified-avatar",
            { body: { userId: data.user.id, imageBase64: faceDataUrl } },
          );
          if (avatarErr) throw avatarErr;
        } catch (e) {
          console.error("avatar upload failed", e);
          toast.error("Couldn't save your verified photo. Please contact support.");
        }
      }

      setLoading(false);
      if (error) {
        const msg = getAuthErrorMessage(error);
        if (/already registered|already exists|log in instead/i.test(msg)) {
          if (role === "worker") setExistingAccountModal({ open: true, email: normalizedEmail });
          else {
            toast.error("Account already exists, please login");
            navigate(`/login?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
          }
        } else {
          toast.error(msg);
        }
        return;
      }
      const defaultRedirect = role === "worker" ? "/worker-dashboard" : "/dashboard";
      const redirect = searchParams.get("redirect") || defaultRedirect;
      const identities = (data.user as { identities?: unknown[] } | null)?.identities;
      if (data.user && !data.session && Array.isArray(identities) && identities.length === 0) {
        if (role === "worker") setExistingAccountModal({ open: true, email: normalizedEmail });
        else {
          toast.error("Account already exists, please login");
          navigate(`/login?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirect)}`, { replace: true });
        }
        return;
      }
      if (data.session) {
        toast.success("Account created!");
        navigate(redirect, { replace: true });
        return;
      }
      toast.success("An 8-digit OTP has been sent to your email.");
      navigate(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}&redirect=${encodeURIComponent(redirect)}`, { replace: true });
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Signup failed.");
    }
  };

  // Shared field styles (template look)
  const fieldWrap = "group rounded-lg border border-[#444748]/20 bg-[#1c1b1b] focus-within:border-[#d9ff7a] focus-within:shadow-[0_0_15px_-3px_rgba(217,255,122,0.3)] transition-all";
  const fieldInput = "w-full bg-transparent border-none outline-none focus:ring-0 py-3 px-3 text-[#e5e2e1] placeholder:text-[#c4c7c7]/40 text-base";
  const labelCls = "block text-[12px] font-semibold uppercase tracking-wider text-[#c4c7c7] px-1 mb-1.5";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#131313] text-[#e5e2e1]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -right-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-[#d9ff7a]/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[30%] w-[30%] rounded-full bg-[#d9ff7a]/5 blur-[100px]" />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-10">
        <img src={logoImg} alt="Near Konnect" className="mb-6 h-12 object-contain" />

        <div className="w-full space-y-6">
          <header className="space-y-1 text-center">
            <h2 className="text-[28px] font-semibold leading-9 tracking-tight">
              {role === "worker" ? "Join as a Pro" : "Create Account"}
            </h2>
            <p className="text-base text-[#c4c7c7]">
              {role === "worker"
                ? "Complete your professional profile to start"
                : "Join the community as a Client today."}
            </p>
          </header>

          <div className="grid grid-cols-2 gap-1 rounded-full border border-[#444748]/20 bg-[#1c1b1b] p-1">
            {(["customer", "worker"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-full py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  role === r ? "bg-[#d9ff7a] text-[#151f00] shadow-sm" : "text-[#c4c7c7]"
                }`}
              >
                {r === "customer" ? "Client" : "Service Pro"}
              </button>
            ))}
          </div>

          <FaceVerification
            verifiedDataUrl={faceDataUrl}
            onVerified={(url, blob) => { setFaceDataUrl(url); setFaceBlob(blob); }}
          />

          <form onSubmit={handleSubmit} className={`space-y-5 rounded-xl border border-[#e5e2e1]/10 bg-[#1a1a1a]/80 p-5 backdrop-blur-md transition ${!faceDataUrl ? "pointer-events-none opacity-40" : ""}`}>
            <fieldset disabled={!faceDataUrl} className="space-y-5">
            {/* Common fields */}
            <div>
              <label className={labelCls}>Full Name</label>
              <div className={fieldWrap}>
                <input className={fieldInput} placeholder={role === "worker" ? "John Doe" : "Alex Rivera"} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email Address</label>
              <div className={fieldWrap}>
                <input type="email" className={fieldInput} placeholder={role === "worker" ? "john@example.com" : "alex@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Phone Number</label>
              <div className={fieldWrap}>
                <input type="tel" className={fieldInput} placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className={`${fieldWrap} flex items-center pr-3`}>
                <input type={showPw ? "text" : "password"} className={fieldInput} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-[#c4c7c7] hover:text-[#e5e2e1]" aria-label="Toggle password">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Worker-only fields */}
            {role === "worker" && (
              <div className="space-y-4 border-t border-[#444748]/20 pt-4">
                <div>
                  <label className={labelCls}>Main Category</label>
                  <div className={fieldWrap}>
                    <select
                      value={mainCategory}
                      onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}
                      className={`${fieldInput} appearance-none cursor-pointer`}
                      required
                    >
                      <option value="" className="bg-[#1c1b1b]">Select Primary Service</option>
                      {mainCategories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-[#1c1b1b]">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Sub Category</label>
                  <div className={fieldWrap}>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      disabled={!mainCategory}
                      className={`${fieldInput} appearance-none cursor-pointer disabled:opacity-50`}
                      required
                    >
                      <option value="" className="bg-[#1c1b1b]">Select Specialization</option>
                      {subCategories.map((s) => (
                        <option key={s.id} value={s.name} className="bg-[#1c1b1b]">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Specific Expertise</label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expertiseChips.map((tag) => {
                      const active = expertiseTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? "border-[#d9ff7a] bg-[#d9ff7a]/10 text-[#d9ff7a]"
                              : "border-[#444748]/30 bg-[#20201f] text-[#c4c7c7] hover:border-[#d9ff7a] hover:text-[#d9ff7a]"
                          }`}
                        >
                          {active ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {tag}
                        </button>
                      );
                    })}
                    {expertiseTags
                      .filter((t) => !expertiseChips.includes(t))
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="flex items-center gap-1 rounded-full border border-[#d9ff7a] bg-[#d9ff7a]/10 px-3 py-1.5 text-xs font-medium text-[#d9ff7a]"
                        >
                          <Check className="h-3.5 w-3.5" /> {tag}
                        </button>
                      ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                      placeholder="Add custom expertise…"
                      className="flex-1 rounded-full border border-[#444748]/30 bg-[#1c1b1b] px-3 py-1.5 text-xs text-[#e5e2e1] placeholder:text-[#c4c7c7]/40 outline-none focus:border-[#d9ff7a]"
                    />
                    <button type="button" onClick={addCustomTag} className="rounded-full border border-[#444748]/30 px-3 py-1.5 text-xs text-[#c4c7c7] hover:text-[#d9ff7a]">Add</button>
                  </div>
                  <p className="mt-1 px-1 text-[11px] italic text-[#c4c7c7]/60">Select all that apply to your professional license.</p>
                </div>

                <div>
                  <label className={labelCls}>Years of Experience</label>
                  <div className={fieldWrap}>
                    <input type="number" min="0" className={fieldInput} placeholder="5" value={experience} onChange={(e) => setExperience(e.target.value)} required />
                  </div>
                </div>
              </div>
            )}

            {/* Blood Konnect */}
            <div className="rounded-lg border border-red-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base font-bold text-red-600">❤</span>
                <span className="text-sm font-bold text-slate-900">Blood Konnect</span>
              </div>
              <label className="flex cursor-pointer items-center gap-3 group">
                <div className="relative">
                  <input className="peer sr-only" type="checkbox" checked={isBloodDonor} onChange={(e) => { setIsBloodDonor(e.target.checked); if (!e.target.checked) setBloodGroup(""); }} />
                  <div className="h-5 w-10 rounded-full bg-slate-200 transition-colors peer-checked:bg-red-500" />
                  <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">Register as a Blood Donor</span>
              </label>
              {isBloodDonor && (
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="mt-3 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none"
                  required
                >
                  <option value="">Select Blood Type</option>
                  {BLOOD_GROUPS.map((bg) => (<option key={bg} value={bg}>{bg}</option>))}
                </select>
              )}
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#444748]/40 bg-[#1c1b1b] text-[#d9ff7a] focus:ring-[#d9ff7a]"
              />
              <span className="text-xs text-[#c4c7c7]">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-[#d9ff7a] underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-[#d9ff7a] underline">Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#d9ff7a] text-[16px] font-semibold text-[#151f00] shadow-[0_4px_20px_rgba(217,255,122,0.2)] transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : role === "worker" ? "Submit Pro Application" : "Create Account"}
            </button>
            </fieldset>
          </form>

          <p className="pb-6 text-center text-sm text-[#c4c7c7]">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[#d9ff7a] hover:underline">Log In</Link>
          </p>
        </div>
      </main>

      <Dialog open={existingAccountModal.open} onOpenChange={(open) => setExistingAccountModal((s) => ({ ...s, open }))}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account already exists</DialogTitle>
            <DialogDescription>
              An account with this email/phone is already registered. Log in and use <strong>Become a Service</strong> to upgrade your existing profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setExistingAccountModal({ open: false, email: "" })}>Cancel</Button>
            <Button
              onClick={() => {
                const em = existingAccountModal.email;
                setExistingAccountModal({ open: false, email: "" });
                navigate(`/login?email=${encodeURIComponent(em)}&upgrade=worker&redirect=${encodeURIComponent("/dashboard?upgrade=worker")}`, { replace: true });
              }}
            >
              Login & Upgrade to Worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
