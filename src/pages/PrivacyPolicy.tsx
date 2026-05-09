import LegalLayout, { LegalSection } from "@/components/LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    subtitle="How we collect, use, and protect your information on Near Konnect."
  >
    <LegalSection index={1} title="Information We Collect">
      <p>
        We collect information you provide directly to us, such as your name, email address, phone number, and
        profession when you create an account. For workers, we may also collect experience details and service
        area information.
      </p>
    </LegalSection>

    <LegalSection index={2} title="How We Use Your Information">
      <p>
        We use the information we collect to provide and improve our services, connect customers with workers,
        facilitate communication, and send service-related notifications.
      </p>
    </LegalSection>

    <LegalSection index={3} title="Location Data">
      <p>
        With your permission, we collect and process location data to show you workers near your location. You can
        disable location services at any time through your browser or device settings.
      </p>
    </LegalSection>

    <LegalSection index={4} title="Data Sharing & Contact Visibility">
      <p>
        We do not sell your personal information. Your profile (name, profession, city) is visible to other users
        to facilitate connections.
      </p>
      <p className="mt-3">
        <strong className="text-foreground">Your contact details (phone, WhatsApp, email) are private by default.</strong>{" "}
        They are only revealed to a client after you explicitly approve their contact request. You may deny or
        revoke approval at any time.
      </p>
    </LegalSection>

    <LegalSection index={5} title="Data Security">
      <p>
        We implement appropriate security measures to protect your personal information. However, no method of
        transmission over the Internet is 100% secure.
      </p>
    </LegalSection>

    <LegalSection index={6} title="Contact Us">
      <p>
        If you have questions about this Privacy Policy, please contact us through the platform's support chatbot.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default PrivacyPolicy;
