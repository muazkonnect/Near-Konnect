import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { useI18n, LANGUAGES } from "@/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";

const Footer = () => {
  const { t, lang, setLang } = useI18n();
  const currentLang = LANGUAGES.find(l => l.code === lang);

  return (
    <footer className="border-t bg-card py-14 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logoImg} alt="Near Konnect" className="h-9 object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connecting you with trusted local professionals near your location.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/discover" className="hover:text-primary transition-colors">Find Services</Link></li>
              <li><Link to="/blood-donors" className="hover:text-primary transition-colors">Blood Donors</Link></li>
              <li><Link to="/register?role=worker" className="hover:text-primary transition-colors">Join as Service</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Log In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Language</h4>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="w-4 h-4" />
                  <span>{currentLang?.flag} {currentLang?.nativeName}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-0.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        lang === l.code
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.nativeName}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Near Konnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;