import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
const Index = lazy(() => import("./pages/Index.tsx"));
const Discover = lazy(() => import("./pages/Discover.tsx"));
const WorkerProfile = lazy(() => import("./pages/WorkerProfile.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard.tsx"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const BloodDonors = lazy(() => import("./pages/BloodDonors.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Disclaimer = lazy(() => import("./pages/Disclaimer.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions.tsx"));
const SupportChatbot = lazy(() => import("./components/SupportChatbot"));
const MobileBottomNav = lazy(() => import("@/components/MobileBottomNav"));
const UnverifiedEmailBanner = lazy(() => import("@/components/UnverifiedEmailBanner"));

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

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={null}>
              <UnverifiedEmailBanner />
            </Suspense>
            <Suspense fallback={<PageLoader />}>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Suspense fallback={null}>
              <MobileBottomNav />
              <SupportChatbot />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
