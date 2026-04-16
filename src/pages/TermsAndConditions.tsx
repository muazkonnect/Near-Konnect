import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Terms & Conditions</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>Last updated: April 2026</p>

        <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>By accessing and using NearConnect, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform.</p>

        <h2 className="text-lg font-semibold text-foreground">2. Platform Role — Communication Only</h2>
        <div className="bg-accent/50 border border-primary/20 rounded-xl p-4">
          <p className="font-semibold text-foreground">Important Notice:</p>
          <p>NearConnect serves <strong>solely as a communication platform</strong> that connects customers with service workers. We are responsible only for facilitating the initial connection and communication between parties.</p>
          <p className="mt-2"><strong>We are NOT responsible for:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The quality, timing, or outcome of any work performed</li>
            <li>Any agreements, payments, or contracts made between customers and workers</li>
            <li>Any damages, injuries, or losses resulting from services rendered</li>
            <li>Disputes between customers and workers</li>
            <li>The accuracy of information provided by workers or customers</li>
          </ul>
          <p className="mt-2">All dealings, negotiations, payments, and service agreements between customers and workers are conducted at your own risk and responsibility.</p>
        </div>

        <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration and to keep your profile information up to date.</p>

        <h2 className="text-lg font-semibold text-foreground">4. User Conduct</h2>
        <p>You agree not to use the platform for any unlawful purpose, harass other clients, post false or misleading information, or engage in any activity that could damage the platform or its reputation.</p>

        <h2 className="text-lg font-semibold text-foreground">5. Reviews and Ratings</h2>
        <p>Clients may leave reviews and ratings for services. Reviews must be honest, fair, and based on genuine experience. We reserve the right to remove reviews that violate our guidelines.</p>

        <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
        <p>NearConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform.</p>

        <h2 className="text-lg font-semibold text-foreground">7. Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>

        <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
        <p>For questions about these Terms, use the in-app support chatbot or contact our team.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default TermsAndConditions;
