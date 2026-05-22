import { useEffect } from "react";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";

const CANONICAL = "https://www.nearkonnect.com/privacy";
const DESCRIPTION =
  "Near Konnect Privacy Policy — what data we collect (account, location, push tokens), how we use it, and your rights.";

const PrivacyPolicy = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Privacy Policy — Near Konnect";

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const desc = setMeta("description", DESCRIPTION);
    const ogTitle = setMeta("og:title", "Privacy Policy — Near Konnect", "property");
    const ogDesc = setMeta("og:description", DESCRIPTION, "property");
    const ogUrl = setMeta("og:url", CANONICAL, "property");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const prevCanonical = canonical.getAttribute("href");
    canonical.setAttribute("href", CANONICAL);

    return () => {
      document.title = prevTitle;
      if (createdCanonical) canonical?.remove();
      else if (prevCanonical) canonical?.setAttribute("href", prevCanonical);
      desc.remove();
      ogTitle.remove();
      ogDesc.remove();
      ogUrl.remove();
    };
  }, []);

  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your information on Near Konnect."
    >
      <LegalSection index={1} title="Information We Collect">
        <p>
          We collect information you provide directly to us — name, email, phone number, and profession when you
          create an account. For workers we also collect experience and service-area details. When you sign in we
          process authentication credentials, and on mobile we store a Firebase Cloud Messaging (FCM) push token
          so we can deliver notifications.
        </p>
      </LegalSection>

      <LegalSection index={2} title="How We Use Your Information">
        <p>
          To provide and improve the service, connect customers with workers, facilitate communication, send
          service-related notifications, and keep the platform safe (fraud and abuse prevention).
        </p>
      </LegalSection>

      <LegalSection index={3} title="Location Data">
        <p>
          With your permission we process device location to show nearby workers and relevant requests. You can
          revoke location access at any time in your device or browser settings.
        </p>
      </LegalSection>

      <LegalSection index={4} title="Data Sharing & Contact Visibility">
        <p>
          We do not sell your personal information. Your public profile (name, profession, city) is visible to
          other users so connections can be made.
        </p>
        <p className="mt-3">
          <strong className="text-foreground">Contact details (phone, WhatsApp, email) are private by default.</strong>{" "}
          They are revealed to a client only after you explicitly approve their contact request, and you may
          revoke approval at any time.
        </p>
      </LegalSection>

      <LegalSection index={5} title="Third-Party Services">
        <p>
          We rely on a small number of processors to operate the app: our managed backend (database, auth, storage
          and edge functions) and Firebase Cloud Messaging for push delivery. These providers process data on our
          behalf under their own security and privacy commitments.
        </p>
      </LegalSection>

      <LegalSection index={6} title="Data Retention & Deletion">
        <p>
          We retain account data for as long as your account is active. You can request deletion of your account
          and associated personal data at any time by contacting us at{" "}
          <a className="text-primary underline" href="mailto:support@nearkonnect.com">
            support@nearkonnect.com
          </a>
          . We will action requests within 30 days, subject to any legal retention obligations.
        </p>
      </LegalSection>

      <LegalSection index={7} title="Children's Privacy">
        <p>
          Near Konnect is not intended for users under 13. We do not knowingly collect personal information from
          children. If you believe a child has provided us data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection index={8} title="Data Security">
        <p>
          We use industry-standard security measures including encrypted transport (HTTPS), row-level database
          access control and hashed credentials. No method of internet transmission is 100% secure.
        </p>
      </LegalSection>

      <LegalSection index={9} title="Contact Us">
        <p>
          Questions or requests regarding this Privacy Policy:{" "}
          <a className="text-primary underline" href="mailto:support@nearkonnect.com">
            support@nearkonnect.com
          </a>
          .
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Effective date: 22 May 2026</p>
      </LegalSection>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
