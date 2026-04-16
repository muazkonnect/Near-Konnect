import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Disclaimer = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Disclaimer</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>Last updated: April 2026</p>
        <h2 className="text-lg font-semibold text-foreground">General Information</h2>
        <p>The information provided on NearConnect is for general informational purposes only. All information on the platform is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information.</p>
        <h2 className="text-lg font-semibold text-foreground">External Links</h2>
        <p>The platform may contain links to external websites or refer to services provided by third parties. NearConnect does not warrant or make any representations regarding the quality, accuracy, or availability of such external websites or services.</p>
        <h2 className="text-lg font-semibold text-foreground">Professional Disclaimer</h2>
        <p>NearConnect does not provide professional advice. The platform serves solely as a communication bridge between customers and service workers. Any reliance you place on such information is strictly at your own risk.</p>
        <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
        <p>In no event shall NearConnect be liable for any loss or damage including, without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from the use of the platform or loss of data or profits arising out of, or in connection with, the use of this platform.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default Disclaimer;
