import LegalLayout, { LegalSection } from "@/components/LegalLayout";

const Disclaimer = () => (
  <LegalLayout
    title="Disclaimer"
    subtitle="Important context about the information and services available on NearKonnect."
  >
    <LegalSection index={1} title="General Information">
      <p>
        The information provided on NearKonnect is for general informational purposes only. All information on the
        platform is provided in good faith; however, we make no representation or warranty of any kind, express or
        implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any
        information.
      </p>
    </LegalSection>

    <LegalSection index={2} title="External Links">
      <p>
        The platform may contain links to external websites or refer to services provided by third parties.
        NearKonnect does not warrant or make any representations regarding the quality, accuracy, or availability of
        such external websites or services.
      </p>
    </LegalSection>

    <LegalSection index={3} title="Professional Disclaimer">
      <p>
        NearKonnect does not provide professional advice. The platform serves solely as a communication bridge
        between customers and service workers. Any reliance you place on such information is strictly at your own
        risk.
      </p>
    </LegalSection>

    <LegalSection index={4} title="Limitation of Liability">
      <p>
        In no event shall NearKonnect be liable for any loss or damage including, without limitation, indirect or
        consequential loss or damage, or any loss or damage whatsoever arising from the use of the platform or loss
        of data or profits arising out of, or in connection with, the use of this platform.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Disclaimer;
