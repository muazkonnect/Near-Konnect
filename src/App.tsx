import { useEffect } from "react";
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
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import WorkerProfile from "./pages/WorkerProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WorkerDashboard from "./pages/WorkerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BloodDonors from "./pages/BloodDonors";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Offline from "./pages/Offline";
import Maintenance from "./pages/Maintenance";
import OfflineBanner from "@/components/OfflineBanner";
import Disclaimer from "./pages/Disclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import MobileBottomNav from "@/components/MobileBottomNav";
import UnverifiedEmailBanner from "@/components/UnverifiedEmailBanner";
import Footer from "@/components/Footer";
import DisclosureModals from "@/components/DisclosureModals";
import WorkerOnboardingDialog from "@/components/WorkerOnboardingDialog";
import SplashScreen from "@/components/SplashScreen";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { loading } = useAuth();

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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/worker/:id" element={<WorkerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/worker-dashboard" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/blood-donors" element={<ProtectedRoute><BloodDonors /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <MobileBottomNav />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
