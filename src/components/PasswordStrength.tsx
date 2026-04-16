import { validatePassword } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";

const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const PasswordStrength = ({ password }: { password: string }) => {
  if (!password) return null;
  const passed = rules.filter(r => r.test(password)).length;
  const strength = passed <= 2 ? "Weak" : passed <= 4 ? "Fair" : "Strong";
  const color = passed <= 2 ? "bg-destructive" : passed <= 4 ? "bg-warning" : "bg-success";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= passed ? color : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Password strength: {strength}</p>
      <div className="grid grid-cols-2 gap-1">
        {rules.map(r => (
          <div key={r.label} className="flex items-center gap-1 text-xs">
            {r.test(password) ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={r.test(password) ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
