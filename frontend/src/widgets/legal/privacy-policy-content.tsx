import { cn } from "@/shared/lib/utils";

interface PrivacyPolicyContentProps {
  className?: string;
}

export function PrivacyPolicyContent({ className }: PrivacyPolicyContentProps) {
  return (
    <article className={cn("space-y-6 text-sm leading-relaxed text-secondary-foreground", className)}>
      <header className="space-y-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Privacy Policy for MeatLens</h2>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Last Updated: May 8, 2026</p>
      </header>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">1. Introduction</h3>
        <p>
          MeatLens is an academic research and decision-support system developed as part of an undergraduate Computer Science thesis project. The platform utilizes artificial intelligence, computer vision, and machine learning technologies to assist in detecting possible meat spoilage through image analysis.
        </p>
        <p>The system is intended strictly for: academic research, educational purposes, prototype demonstration, and decision-support assistance.</p>
        <p>MeatLens does not replace professional food safety inspections, laboratory testing, regulatory evaluations, or official food safety certifications. All AI-generated outputs should be treated as recommendations only.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">2. Information Collected</h3>
        <p><strong>Uploaded Images:</strong> Users may upload meat product images, inspection-related photographs, and sample datasets for evaluation and testing. These images are processed by AI models for spoilage detection and analysis.</p>
        <p><strong>User Information:</strong> If authentication and account management features are enabled, the system may collect full name, email address, institutional role, and login credentials (secured using encryption or hashing methods).</p>
        <p><strong>Device and Usage Information:</strong> The system may automatically collect browser information, device type, IP address, access timestamps, error logs, and system activity records.</p>
        <p><strong>Research and Dataset Information:</strong> Images, metadata, annotations, and analytical results used for model training, validation, performance testing, research documentation, and academic evaluation may be securely stored for thesis and research purposes.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">3. Purpose of Data Collection</h3>
        <p>Collected information may be used for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>AI-powered spoilage detection</li>
          <li>Improving machine learning model accuracy</li>
          <li>Conducting research and experimentation</li>
          <li>Generating analytical outputs</li>
          <li>Debugging and maintaining the platform</li>
          <li>Academic presentation and thesis documentation</li>
          <li>System optimization and evaluation</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">4. AI and Machine Learning Disclaimer</h3>
        <p>MeatLens uses artificial intelligence and machine learning models that may produce incorrect predictions, false positives, false negatives, and inconsistent outputs under varying environmental conditions.</p>
        <p>Factors such as lighting, camera quality, image angle, dataset limitations, and environmental conditions may affect prediction accuracy.</p>
        <p>Users acknowledge that AI-generated results are recommendations only, human validation and professional inspection remain necessary, and the system should not be solely relied upon for food safety decisions.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">5. Data Storage and Security</h3>
        <p>Reasonable technical and organizational security measures are implemented, including password hashing and credential protection, role-based access controls, restricted administrative access, database security configurations, and secure handling of uploaded datasets. Despite these measures, no electronic system can guarantee absolute security.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">6. Access Control and Confidentiality</h3>
        <p>Access to MeatLens data, uploaded images, analysis results, inspection records, and system information is strictly limited to authorized personnel only, including authorized meat inspectors, designated regulatory or institutional officials, approved thesis researchers and advisers, and system administrators with authorized access.</p>
        <p>Unauthorized access, duplication, modification, disclosure, or distribution of system data is strictly prohibited.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">7. Data Sharing and Disclosure</h3>
        <p>MeatLens does not sell, trade, or commercially distribute personal information or uploaded inspection data.</p>
        <p>Information may only be disclosed to authorized academic advisers and evaluators, designated institutional or regulatory officials when necessary, for thesis defense and academic review purposes, when required by applicable laws or regulations, and for academic publication using anonymized or non-identifiable data.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">8. Data Retention</h3>
        <p>Research data, uploaded images, and analytical records may be retained for thesis completion, academic defense and evaluation, research validation and verification, and future academic improvements and experimentation. Data that is no longer necessary may be deleted, archived, or anonymized when appropriate.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">9. User Responsibilities</h3>
        <p>Users agree:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Not to upload unlawful, malicious, harmful, or inappropriate content</li>
          <li>Not to attempt unauthorized access to the system</li>
          <li>Not to manipulate or falsify inspection data</li>
          <li>To use the system responsibly and ethically</li>
          <li>To understand that the platform remains experimental and research-oriented</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">10. Third-Party Services</h3>
        <p>The system may utilize third-party technologies and services, including cloud database services, hosting providers, AI inference frameworks, analytics tools, and image processing libraries. These third-party services may operate under their own privacy policies and terms of service.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">11. Children&apos;s Privacy</h3>
        <p>MeatLens is not intended for individuals under the age of 13. The system does not knowingly collect personal information from children.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">12. Limitation of Liability</h3>
        <p>The developers, researchers, and affiliated institutions of MeatLens shall not be held liable for incorrect AI predictions, false classifications, misinterpretation of analytical outputs, food safety incidents, financial or operational losses, or decisions made solely using AI-generated recommendations.</p>
        <p>Users acknowledge that MeatLens is a research and decision-support platform and not a certified food safety authority.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">13. Changes to This Privacy Policy</h3>
        <p>This Privacy Policy may be modified or updated as the system evolves throughout the research and development process. Updated versions may be posted within the system documentation or platform interface.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">14. Contact Information</h3>
        <p>For inquiries regarding this Privacy Policy or the MeatLens thesis project, users may contact the project developers or supervising academic institution through official communication channels.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">15. Research Notice</h3>
        <p>MeatLens is an undergraduate Computer Science thesis project developed for academic, educational, and research purposes under faculty supervision.</p>
        <p>The platform may still be undergoing testing, experimental evaluation, dataset refinement, accuracy validation, model optimization, and feature development.</p>
        <p>By using the system, users acknowledge and accept these conditions.</p>
      </section>
    </article>
  );
}
