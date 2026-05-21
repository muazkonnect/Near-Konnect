import { Phone, Video, MessageCircle, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import WhatsappIcon from "@/components/icons/WhatsappIcon";
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export type ContactType = "phone" | "whatsapp" | "imo" | "botim" | "viber" | "telegram" | "signal";

export interface ContactMethod {
  type: ContactType;
  value: string;
}

export interface ContactAppDef {
  type: ContactType;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon button background/text */
  brandClass: string;
  /** Hint shown below the input */
  placeholder: string;
  /** True if the value should be a phone number */
  isPhone: boolean;
}

export const CONTACT_APPS: ContactAppDef[] = [
  { type: "whatsapp", label: "WhatsApp", icon: WhatsappIcon as unknown as LucideIcon, brandClass: "bg-[#25D366] text-white", placeholder: "+92 3XX XXXXXXX", isPhone: true },
  { type: "phone",    label: "Phone",    icon: Phone,          brandClass: "bg-foreground text-background",  placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "imo",      label: "IMO",      icon: Video,          brandClass: "bg-[#3776E5] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "botim",    label: "Botim",    icon: Video,          brandClass: "bg-[#34D9C8] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "viber",    label: "Viber",    icon: MessageCircle,  brandClass: "bg-[#7360F2] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "telegram", label: "Telegram", icon: Send,           brandClass: "bg-[#229ED9] text-white",        placeholder: "@username or +92...", isPhone: false },
  { type: "signal",   label: "Signal",   icon: MessageCircle,  brandClass: "bg-[#3A76F0] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
];


export const CONTACT_APP_BY_TYPE: Record<ContactType, ContactAppDef> = CONTACT_APPS.reduce(
  (acc, app) => ({ ...acc, [app.type]: app }),
  {} as Record<ContactType, ContactAppDef>
);

/** Strip everything except digits and a leading + */
export const sanitizePhone = (raw: string): string => {
  const trimmed = (raw || "").trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

/** Phone without leading + (for wa.me / viber / etc.) */
const phoneNoPlus = (raw: string) => sanitizePhone(raw).replace(/^\+/, "");

export const buildContactHref = (method: ContactMethod): string | null => {
  const value = (method.value || "").trim();
  if (!value) return null;
  const noPlus = phoneNoPlus(value);
  const withPlus = sanitizePhone(value);

  switch (method.type) {
    case "phone":    return `tel:${withPlus}`;
    case "whatsapp": return noPlus ? `https://wa.me/${noPlus}` : null;
    case "viber":    return noPlus ? `viber://chat?number=%2B${noPlus}` : null;
    case "telegram": return value.startsWith("@")
      ? `https://t.me/${value.slice(1)}`
      : noPlus ? `https://t.me/+${noPlus}` : null;
    case "signal":   return noPlus ? `https://signal.me/#p/+${noPlus}` : null;
    // IMO and Botim have no reliable web deep link — fall back to phone dial
    case "imo":
    case "botim":    return `tel:${withPlus}`;
  }
};

/** Normalize a contact value for storage: phones → E.164 with no spaces; others → trimmed, no internal whitespace. */
export const normalizeContactValue = (type: ContactType, value: string): string => {
  const app = CONTACT_APP_BY_TYPE[type];
  const raw = (value || "").trim();
  if (!raw) return "";
  if (app.isPhone) {
    // Strip ALL whitespace, keep only digits and a single leading +
    return sanitizePhone(raw);
  }
  // For username-style contacts (e.g. Telegram), strip internal whitespace
  return raw.replace(/\s+/g, "");
};

/** Apply normalizeContactValue to every method. Use right before persisting to DB.
 *  Preserves entries; empty values are kept so validation can flag them. */
export const normalizeContactMethods = (methods: ContactMethod[]): ContactMethod[] =>
  methods.map((m) => ({ type: m.type, value: normalizeContactValue(m.type, m.value) }));

export const validateContactMethods = (methods: ContactMethod[]): string | null => {
  if (methods.length > 10) return "You can add at most 10 contact methods.";
  const seen = new Set<string>();
  for (const m of methods) {
    const app = CONTACT_APP_BY_TYPE[m.type];
    if (!m.value.trim()) return `Please fill in your ${app.label} or remove it.`;
    if (m.value.length > 64) return `${app.label} value is too long.`;
    if (app.isPhone) {
      if (!isValidPhoneNumber(m.value)) {
        return `${app.label} number is invalid for the selected country.`;
      }
    }
    const key = `${m.type}:${m.value.trim().toLowerCase()}`;
    if (seen.has(key)) return `Duplicate ${app.label} entry.`;
    seen.add(key);
  }
  return null;
};

/** Parse an E.164 string back into { country, national }. */
export const splitPhone = (
  e164: string,
  fallbackCountry: CountryCode = "PK",
): { country: CountryCode; national: string } => {
  const parsed = parsePhoneNumberFromString(e164 || "");
  if (parsed && parsed.country) {
    return { country: parsed.country, national: parsed.nationalNumber };
  }
  return { country: fallbackCountry, national: (e164 || "").replace(/\D/g, "") };
};

/** Build an E.164 string from a country + national digits. Returns "" if empty. */
export const composePhone = (country: CountryCode, national: string): string => {
  const digits = (national || "").replace(/\D/g, "");
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country);
  if (parsed) return parsed.number;
  try {
    const cc = getCountryCallingCode(country);
    // Strip leading country code if user typed it as part of the national field
    const stripped = digits.startsWith(cc) ? digits.slice(cc.length) : digits;
    return `+${cc}${stripped}`;
  } catch {
    return `+${digits}`;
  }
};

export const parseContactMethods = (raw: unknown): ContactMethod[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ContactMethod =>
      !!m && typeof m === "object" && typeof (m as any).type === "string" && typeof (m as any).value === "string"
    )
    .filter((m) => (CONTACT_APP_BY_TYPE as Record<string, unknown>)[m.type] !== undefined);
};
