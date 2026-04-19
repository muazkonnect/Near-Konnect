import { Phone, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FaWhatsapp, FaViber, FaTelegramPlane, FaSignalMessenger } from "react-icons/fa6";
import type { IconType } from "react-icons";

export type ContactType = "phone" | "whatsapp" | "imo" | "botim" | "viber" | "telegram" | "signal";

export interface ContactMethod {
  type: ContactType;
  value: string;
}

export interface ContactAppDef {
  type: ContactType;
  label: string;
  icon: LucideIcon | IconType;
  /** Tailwind classes for the icon button background/text */
  brandClass: string;
  /** Hint shown below the input */
  placeholder: string;
  /** True if the value should be a phone number */
  isPhone: boolean;
}

export const CONTACT_APPS: ContactAppDef[] = [
  { type: "phone",    label: "Phone",    icon: Phone,             brandClass: "bg-foreground text-background",  placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "whatsapp", label: "WhatsApp", icon: FaWhatsapp,        brandClass: "bg-[#25D366] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "imo",      label: "IMO",      icon: Video,             brandClass: "bg-[#3776E5] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "botim",    label: "Botim",    icon: Video,             brandClass: "bg-[#34D9C8] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "viber",    label: "Viber",    icon: FaViber,           brandClass: "bg-[#7360F2] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
  { type: "telegram", label: "Telegram", icon: FaTelegramPlane,   brandClass: "bg-[#229ED9] text-white",        placeholder: "@username or +92...", isPhone: false },
  { type: "signal",   label: "Signal",   icon: FaSignalMessenger, brandClass: "bg-[#3A76F0] text-white",        placeholder: "+92 3XX XXXXXXX",     isPhone: true  },
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

export const validateContactMethods = (methods: ContactMethod[]): string | null => {
  if (methods.length > 10) return "You can add at most 10 contact methods.";
  const seen = new Set<string>();
  for (const m of methods) {
    if (!m.value.trim()) return `Please fill in your ${CONTACT_APP_BY_TYPE[m.type].label}.`;
    const key = `${m.type}:${m.value.trim().toLowerCase()}`;
    if (seen.has(key)) return `Duplicate ${CONTACT_APP_BY_TYPE[m.type].label} entry.`;
    seen.add(key);
    if (m.value.length > 64) return "Contact value too long.";
  }
  return null;
};

export const parseContactMethods = (raw: unknown): ContactMethod[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ContactMethod =>
      !!m && typeof m === "object" && typeof (m as any).type === "string" && typeof (m as any).value === "string"
    )
    .filter((m) => (CONTACT_APP_BY_TYPE as Record<string, unknown>)[m.type] !== undefined);
};
