import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  AsYouType,
  getExampleNumber,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ALL_COUNTRIES, getCountry } from "@/lib/countries";
import { composePhone, splitPhone } from "@/lib/contactMethods";

interface PhoneFieldProps {
  /** Stored E.164 string, e.g. "+923001234567". */
  value: string;
  onChange: (e164: string) => void;
  /** Detected/default country if value is empty. */
  defaultCountry: CountryCode;
  placeholderLabel?: string;
  ariaLabel?: string;
  className?: string;
  variant?: "default" | "hero" | "dark";
}

const PhoneField = ({
  value,
  onChange,
  defaultCountry,
  ariaLabel,
  className = "",
  variant = "default",
}: PhoneFieldProps) => {
  const hero = variant === "hero";
  const dark = variant === "dark";
  // Determine the country either from the stored E.164 or the detected default
  const split = splitPhone(value, defaultCountry);
  const [country, setCountry] = useState<CountryCode>(split.country);
  const [open, setOpen] = useState(false);

  // Effective country: if user typed a value containing the dial code already,
  // keep the parsed country; otherwise the explicitly chosen one.
  const effectiveCountry = (() => {
    const parsed = parsePhoneNumberFromString(value || "");
    return parsed?.country ?? country;
  })();

  const countryEntry = getCountry(effectiveCountry) ?? getCountry(defaultCountry)!;

  // Pull the national digits out of whatever is stored. Works even for
  // partial/incomplete numbers like "+923" where strict parsing returns null.
  const nationalDigits = useMemo(() => {
    const raw = value || "";
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed) return parsed.nationalNumber;
    const allDigits = raw.replace(/\D/g, "");
    if (!allDigits) return "";
    const dial = countryEntry.dialCode;
    if (raw.startsWith("+") && allDigits.startsWith(dial)) {
      return allDigits.slice(dial.length);
    }
    return allDigits;
  }, [value, countryEntry.dialCode]);

  const displayNational = useMemo(() => {
    if (!nationalDigits) return "";
    const formatter = new AsYouType(effectiveCountry);
    const out = formatter.input(nationalDigits);
    return out || nationalDigits;
  }, [nationalDigits, effectiveCountry]);

  const examplePlaceholder = useMemo(() => {
    try {
      const ex = getExampleNumber(effectiveCountry, examples as any);
      return ex ? ex.formatNational() : "Phone number";
    } catch {
      return "Phone number";
    }
  }, [effectiveCountry]);

  // Only flag invalid once the user has typed enough digits to plausibly
  // complete a number (avoids "Invalid" warning on every keystroke).
  const isValid = !nationalDigits || nationalDigits.length < 6 || isValidPhoneNumber(value);

  const handleNationalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    onChange(composePhone(effectiveCountry, digits));
  };

  const handlePickCountry = (iso: CountryCode) => {
    setCountry(iso);
    setOpen(false);
    // Re-compose the existing national digits under the new country
    const parsed = parsePhoneNumberFromString(value || "");
    const digits = parsed ? parsed.nationalNumber : (value || "").replace(/\D/g, "");
    onChange(composePhone(iso, digits));
  };

  return (
    <div className={className}>
      <div
        className={`flex ${hero ? "h-10" : "h-12"} w-full items-stretch overflow-hidden rounded-lg border ${
          hero ? "bg-hero-foreground/5" : dark ? "bg-[#1c1b1b]" : "bg-background"
        } ${
          isValid
            ? hero
              ? "border-hero-foreground/15"
              : dark
                ? "border-[#444748]/20 focus-within:border-[#d9ff7a] focus-within:shadow-[0_0_15px_-3px_rgba(217,255,122,0.3)] transition-all"
                : "border-input"
            : "border-destructive/60"
        }`}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex shrink-0 items-center gap-1.5 border-r px-2.5 text-sm transition-colors ${
                hero
                  ? "border-hero-foreground/15 bg-hero-foreground/10 text-hero-foreground hover:bg-hero-foreground/15"
                  : dark
                    ? "border-[#444748]/20 bg-[#20201f] text-[#e5e2e1] hover:bg-[#262625]"
                    : "border-input bg-muted/30 hover:bg-muted/60"
              }`}
              aria-label="Select country"
            >
              <span className="text-base leading-none">{countryEntry.flag}</span>
              <span className="font-medium">+{countryEntry.dialCode}</span>
              <ChevronDown className={`h-3.5 w-3.5 ${hero ? "text-hero-foreground/60" : dark ? "text-[#c4c7c7]" : "text-muted-foreground"}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <div className="flex items-center border-b px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <CommandInput placeholder="Search country…" className="border-0 focus:ring-0" />
              </div>
              <CommandList className="max-h-72">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {ALL_COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.name} ${c.code} +${c.dialCode}`}
                      onSelect={() => handlePickCountry(c.code)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">+{c.dialCode}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          value={displayNational}
          onChange={(e) => handleNationalChange(e.target.value)}
          placeholder={examplePlaceholder}
          aria-label={ariaLabel || "Phone number"}
          inputMode="tel"
          className={`h-full flex-1 rounded-none border-0 bg-transparent px-3 focus-visible:ring-0 ${
            hero
              ? "text-hero-foreground placeholder:text-hero-foreground/40"
              : dark
                ? "text-[#e5e2e1] placeholder:text-[#c4c7c7]/40"
                : ""
          }`}
        />
      </div>
      {!isValid && (
        <p className="mt-1 px-1 text-[11px] text-destructive">
          Invalid number for {countryEntry.name}.
        </p>
      )}
    </div>
  );
};

export default PhoneField;
