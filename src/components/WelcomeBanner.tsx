import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Search, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const DISMISSED_KEY = "nk_welcome_dismissed";

const WelcomeBanner = ({ firstName }: { firstName: string }) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative rounded-2xl bg-gradient-brand p-6 md:p-8 mb-8 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <button onClick={dismiss} className="absolute top-3 right-3 text-primary-foreground/60 hover:text-primary-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/80">Welcome to Near Konnect!</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-primary-foreground mb-2">
              Hey {firstName}, glad to have you here! 🎉
            </h2>
            <p className="text-primary-foreground/80 mb-5 max-w-lg text-sm">
              Here's how to get started — find a service, chat directly, and get the job done.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: Search, title: "Find Services", desc: "Search by service or location" },
                { icon: MessageCircle, title: "Chat & Book", desc: "Message services directly" },
                { icon: Star, title: "Rate & Review", desc: "Share your experience" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-primary-foreground/10 rounded-xl p-3">
                  <step.icon className="w-5 h-5 text-primary-foreground/80 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary-foreground">{step.title}</p>
                    <p className="text-xs text-primary-foreground/70">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                size="sm"
                onClick={() => { dismiss(); navigate("/discover"); }}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl font-semibold"
              >
                Explore Services
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl"
              >
                Got it, dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeBanner;
