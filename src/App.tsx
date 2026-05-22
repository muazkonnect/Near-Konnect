import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import UnverifiedEmailBanner from "@/components/UnverifiedEmailBanner";
import Footer from "@/components/Footer";
import DisclosureModals from "@/components/DisclosureModals";
import WorkerOnboardingDialog from "@/components/WorkerOnboardingDialog";
import AssistantSheet from "@/components/assistant/AssistantSheet";
import SplashScreen from "@/components/SplashScreen";
import LocationGate from "@/components/LocationGate";
import { useAuth } from "@/contexts/AuthContext";
import { usePushAutoRegister } from "@/hooks/usePushAutoRegister";
import { WalletProvider } from "@/contexts/WalletContext";

// Eager: homepage (most-visited entry point)
import Home from "./pages/Home";

// Lazy: every other route — they only load when the user actually navigates.
const Discover = lazy(() => import("./pages/Discover"));
const WorkerProfile = lazy(() => import("./pages/WorkerProfile"));
const WorkerShareRedirect = lazy(() => import("./pages/WorkerShareRedirect"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdsDashboard = lazy(() => import("./pages/AdsDashboard"));
const BloodDonors = lazy(() => import("./pages/BloodDonors"));
const Chat = lazy(() => import("./pages/Chat"));
const Messages = lazy(() => import("./pages/Messages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Offline = lazy(() => import("./pages/Offline"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const WalletPage = lazy(() => import("./pages/wallet/WalletPage"));
const BuySparksPage = lazy(() => import("./pages/wallet/BuySparksPage"));
const PaymentCheckoutPage = lazy(() => import("./pages/wallet/PaymentCheckoutPage"));
const PaymentStatusPage = lazy(() => import("./pages/wallet/PaymentStatusPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache aggressively — most lists barely change between visits.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const AppContent = () => {
  const { loading } = useAuth();
  usePushAutoRegister();

  useEffect(() => {
    // Hide the initial HTML splash screen once React has mounted and taken over
    if (typeof (window as any).hideHtmlSplash === "function") {
      (window as any).hideHtmlSplash();
    }
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && <SplashScreen key="splash" />}
      </AnimatePresence>
      <BrowserRouter>
        <OfflineBanner />
        <UnverifiedEmailBanner />
        <DisclosureModals />
        <WorkerOnboardingDialog />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/worker/:id" element={<WorkerProfile />} />
            <Route path="/w/:id" element={<WorkerShareRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/worker-dashboard" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/worker/ads" element={<ProtectedRoute><AdsDashboard /></ProtectedRoute>} />
            <Route path="/blood-donors" element={<BloodDonors />} />
            <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/wallet/buy" element={<ProtectedRoute><BuySparksPage /></ProtectedRoute>} />
            <Route path="/wallet/buy/:packageId/checkout" element={<ProtectedRoute><PaymentCheckoutPage /></ProtectedRoute>} />
            <Route path="/wallet/payment/:id" element={<ProtectedRoute><PaymentStatusPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
        <MobileBottomNav />
        <AssistantSheet />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </WalletProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
