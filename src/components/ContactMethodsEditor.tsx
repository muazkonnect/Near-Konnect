import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTACT_APPS,
  CONTACT_APP_BY_TYPE,
  type ContactMethod,
  type ContactType,
} from "@/lib/contactMethods";

interface Props {
  value: ContactMethod[];
  onChange: (next: ContactMethod[]) => void;
  /** When true, at least one Phone entry is locked in and cannot be removed */
  requirePhone?: boolean;
}

const ContactMethodsEditor = ({ value, onChange, requirePhone = false }: Props) => {
  const usedTypes = new Set(value.map((m) => m.type));
  const availableApps = CONTACT_APPS.filter((a) => !usedTypes.has(a.type));

  const addMethod = (type: ContactType) => {
    onChange([...value, { type, value: "" }]);
  };

  const updateValue = (idx: number, v: string) => {
    const next = value.slice();
    next[idx] = { ...next[idx], value: v };
    onChange(next);
  };

  const removeMethod = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {value.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            No contact methods yet. Add one below.
          </p>
        )}
        {value.map((m, idx) => {
          const app = CONTACT_APP_BY_TYPE[m.type];
          const Icon = app.icon;
          const isLockedPhone = requirePhone && m.type === "phone";
          return (
            <div key={`${m.type}-${idx}`} className="flex items-center gap-2">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${app.brandClass}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Input
                  value={m.value}
                  onChange={(e) => updateValue(idx, e.target.value)}
                  placeholder={app.placeholder}
                  aria-label={`${app.label} contact value`}
                  className="h-11 rounded-xl"
                />
                <p className="mt-0.5 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{app.label}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMethod(idx)}
                disabled={isLockedPhone}
                aria-label={`Remove ${app.label}`}
                className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {availableApps.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Plus className="mr-1 inline h-3 w-3" /> Add contact app
          </p>
          <div className="flex flex-wrap gap-2">
            {availableApps.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.type}
                  type="button"
                  onClick={() => addMethod(a.type)}
                  className={`tap-feedback inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 ${a.brandClass}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactMethodsEditor;
