import { AlertTriangle } from "lucide-react";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";

const TermsAndConditions = () => (
  <LegalLayout
    title="Terms & Conditions"
    subtitle="The rules of the road for using NearKonnect — please read carefully before signing up."
  >
    <LegalSection index={1} title="Acceptance of Terms">
      <p>
        By accessing and using NearKonnect, you accept and agree to be bound by these Terms and Conditions.
        If you do not agree, please do not use the platform.
      </p>
    </LegalSection>

    <LegalSection index={2} title="Platform Role — Communication Only">
      <div className="rounded-2xl border border-primary/30 bg-accent/40 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="space-y-3">
            <p className="font-semibold text-foreground">Important Notice</p>
            <p>
              NearKonnect serves <strong className="text-foreground">solely as a communication platform</strong>{" "}
              that connects customers with service workers. We are responsible only for facilitating the initial
              connection and communication between parties.
            </p>
            <p className="font-semibold text-foreground">We are NOT responsible for:</p>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-primary">
              <li>The quality, timing, or outcome of any work performed</li>
              <li>Any agreements, payments, or contracts made between customers and workers</li>
              <li>Any damages, injuries, or losses resulting from services rendered</li>
              <li>Disputes between customers and workers</li>
              <li>The accuracy of information provided by workers or customers</li>
            </ul>
            <p>
              All dealings, negotiations, payments, and service agreements between customers and workers are
              conducted at your own risk and responsibility.
            </p>
            <p>
              <strong className="text-foreground">Contact Privacy:</strong> Your contact information will only be
              visible to clients you explicitly approve. No one can view your phone number or other contact details
              without your consent.
            </p>
          </div>
        </div>
      </div>
    </LegalSection>

    <LegalSection index={3} title="User Accounts">
      <p>
        You are responsible for maintaining the confidentiality of your account credentials. You agree to provide
        accurate and complete information during registration and to keep your profile information up to date.
      </p>
    </LegalSection>

    <LegalSection index={4} title="User Conduct">
      <p>
        You agree not to use the platform for any unlawful purpose, harass other clients, post false or misleading
        information, or engage in any activity that could damage the platform or its reputation.
      </p>
    </LegalSection>

    <LegalSection index={5} title="Reviews and Ratings">
      <p>
        Clients may leave reviews and ratings for services. Reviews must be honest, fair, and based on genuine
        experience. We reserve the right to remove reviews that violate our guidelines.
      </p>
    </LegalSection>

    <LegalSection index={6} title="Limitation of Liability">
      <p>
        NearKonnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages
        resulting from your use of or inability to use the platform.
      </p>
    </LegalSection>

    <LegalSection index={7} title="Changes to Terms">
      <p>
        We reserve the right to modify these terms at any time. Continued use of the platform after changes
        constitutes acceptance of the new terms.
      </p>
    </LegalSection>

    <LegalSection index={8} title="Contact">
      <p>For questions about these Terms, use the in-app support chatbot or contact our team.</p>
    </LegalSection>
  </LegalLayout>
);

export default TermsAndConditions;
