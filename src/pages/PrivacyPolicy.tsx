import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>Last updated: April 2026</p>
        <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>We collect information you provide directly to us, such as your name, email address, phone number, city, and profession when you create an account. For workers, we may also collect experience details and service area information.</p>
        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <p>We use the information we collect to provide and improve our services, connect customers with workers, facilitate communication, and send service-related notifications.</p>
        <h2 className="text-lg font-semibold text-foreground">Location Data</h2>
        <p>With your permission, we collect and process location data to show you workers near your location. You can disable location services at any time through your browser or device settings.</p>
        <h2 className="text-lg font-semibold text-foreground">Data Sharing</h2>
        <p>We do not sell your personal information. We share your profile information only with other clients as necessary to facilitate the connection between customers and workers on the platform.</p>
        <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
        <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>
        <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us through the platform's support chatbot.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPolicy;
