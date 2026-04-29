import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OfflineBanner = () => {
  const online = useOnlineStatus();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-lg"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>You're offline — some features may not work.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
