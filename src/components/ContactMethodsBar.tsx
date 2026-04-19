import { MessageSquare } from "lucide-react";
import {
  CONTACT_APP_BY_TYPE,
  buildContactHref,
  type ContactMethod,
} from "@/lib/contactMethods";

interface Props {
  methods: ContactMethod[];
  /** Optional in-app message handler. If provided, an extra in-app chat icon is rendered. */
  onInAppMessage?: () => void;
  onChannelClick?: (method: ContactMethod) => void;
  className?: string;
  /** Visual variant — "hero" matches the dark profile banner. */
  variant?: "hero" | "card";
}

const ContactMethodsBar = ({ methods, onInAppMessage, onChannelClick, className = "", variant = "hero" }: Props) => {
  const visible = methods.filter((m) => buildContactHref(m));

  if (visible.length === 0 && !onInAppMessage) {
    return (
      <p className={`text-xs ${variant === "hero" ? "text-hero-muted" : "text-muted-foreground"}`}>
        No contact options shared.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {visible.map((m) => {
        const app = CONTACT_APP_BY_TYPE[m.type];
        const href = buildContactHref(m)!;
        const Icon = app.icon;
        const isExternal = href.startsWith("http") || href.startsWith("viber://");
        return (
          <a
            key={`${m.type}-${m.value}`}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={() => onChannelClick?.(m)}
            aria-label={`Contact via ${app.label}`}
            title={`${app.label}: ${m.value}`}
            className={`tap-feedback grid h-11 w-11 place-items-center rounded-full shadow-sm transition hover:scale-105 active:scale-95 ${app.brandClass}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
      {onInAppMessage && (
        <button
          type="button"
          onClick={onInAppMessage}
          aria-label="In-app message"
          title="In-app message"
          className="tap-feedback grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:scale-105 active:scale-95"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default ContactMethodsBar;
