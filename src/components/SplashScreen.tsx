import { motion } from "framer-motion";
import logoImg from "@/assets/logo.svg";

const SplashScreen = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-hero text-hero-foreground"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <img 
            src={logoImg} 
            alt="NearKonnect" 
            className="relative h-16 w-auto object-contain sm:h-20" 
          />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">NearKonnect</h1>
          <p className="text-sm text-hero-muted sm:text-base">Connecting you to local help</p>
        </div>

        <div className="mt-8 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.2,
              }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
