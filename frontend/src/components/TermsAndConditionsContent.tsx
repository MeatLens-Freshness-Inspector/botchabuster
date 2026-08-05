import { cn } from "@/lib/utils";

interface TermsAndConditionsContentProps {
  className?: string;
}

export function TermsAndConditionsContent({ className }: TermsAndConditionsContentProps) {
  return (
    <article className={cn("space-y-6 text-sm leading-relaxed text-secondary-foreground", className)}>
      <header className="space-y-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">MeatLens - Terms and Conditions (Field Use Version)</h2>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Effective Date: May 1, 2026</p>
      </header>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">1. Purpose of the System</h3>
        <p>
          MeatLens is an AI-assisted inspection tool designed to help meat inspectors, market authorities, and
          vendors identify potential indicators of meat spoilage and poor handling conditions.
        </p>
        <p>The system supports on-site inspection workflows, including wet market and field environments.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">2. Scope and Limitations</h3>
        <p>MeatLens is a decision-support tool, not a diagnostic or certification authority. Its scope and limitations are as follows:</p>

        <p>
          <strong>Product Scope</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            MeatLens is trained and validated specifically for <strong>pork</strong> freshness classification. It is not
            designed or validated for other meat types (e.g., beef, poultry, seafood), and results on non-pork samples
            should not be relied upon.
          </li>
          <li>
            The system is intended for use within the context of wet market and field inspection settings, consistent
            with the Ikot-Palengke Program of Olongapo wet markets.
          </li>
        </ul>

        <p>
          <strong>Functional Scope</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            MeatLens performs image-based classification only. It does not perform microbiological, chemical, or
            laboratory-grade testing, and cannot detect contamination, pathogens, or chemical adulteration that is not
            visually apparent.
          </li>
          <li>
            The system produces advisory risk indicators (e.g., Fresh, Suspect, Spoiled). It does not issue
            certifications, official findings, or regulatory rulings.
          </li>
        </ul>

        <p>
          <strong>Technical Limitations</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Classification accuracy depends on training data coverage and may not generalize to all pork cuts, breeds,
            handling conditions, or spoilage presentations, particularly those underrepresented in the training
            dataset.
          </li>
          <li>
            Model performance is affected by image quality, lighting conditions, camera hardware, angle, and occlusion.
            Degraded input conditions may reduce accuracy.
          </li>
          <li>
            As with any AI classification model, MeatLens is subject to a non-zero rate of false positives and false
            negatives and should not be treated as infallible.
          </li>
          <li>
            The system&apos;s underlying model and thresholds are calibrated against publicly available and peer-reviewed
            food science references. Where region-specific or agency-issued freshness standards exist, users should
            defer to those official standards where applicable.
          </li>
        </ul>

        <p>
          <strong>Out-of-Scope Use</strong>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>MeatLens is not intended for use as a standalone basis for enforcement actions, penalties, confiscation, or public health rulings.</li>
          <li>
            MeatLens is not intended for use outside meat inspection support (e.g., general food safety auditing,
            unrelated product categories, or non-inspection commercial purposes).
          </li>
          <li>The system is not a substitute for licensed veterinary, food safety, or regulatory authority judgment.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">3. Role of the User (Inspector Responsibility)</h3>
        <p>MeatLens is a support tool only. All users, especially licensed inspectors, acknowledge that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Final decisions must be based on professional judgment.</li>
          <li>The system does not replace official inspection protocols.</li>
          <li>Users must follow existing guidelines from relevant authorities (for example LGU regulations and institutional policies).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">4. Proper Use in Field Conditions</h3>
        <p>To ensure reliable results, users must:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Capture clear images under adequate lighting.</li>
          <li>Avoid using heavily obstructed or contaminated samples.</li>
          <li>Use the system as part of a broader inspection process, not as a standalone test.</li>
        </ul>
        <p>Improper usage may result in inaccurate outputs.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">5. AI Output Limitations</h3>
        <p>Users acknowledge that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Results are advisory in nature (for example Fresh, Suspect, Spoiled).</li>
          <li>The system may produce false positives or false negatives.</li>
          <li>Environmental conditions affect accuracy, including lighting, camera quality, and storage conditions.</li>
        </ul>
        <p>MeatLens provides risk indicators, not definitive rulings.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">6. Enforcement and Decision-Making</h3>
        <p>Any enforcement action (for example confiscation, penalties, or reporting violations):</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Must be carried out by authorized personnel.</li>
          <li>Must follow official procedures and documentation standards.</li>
          <li>Must not rely solely on MeatLens results.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">7. Data Handling</h3>
        <p>When using the system:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Captured images may be stored for inspection records and system improvement.</li>
          <li>Data may be reviewed for audit, research, or model refinement purposes.</li>
          <li>Sensitive or identifiable data must be handled in accordance with the Philippine Data Privacy Act of 2012.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">8. Offline Use</h3>
        <p>MeatLens may function without internet access. In such cases:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Some features may be limited.</li>
          <li>Data may be stored locally and synced later.</li>
          <li>Users are responsible for ensuring proper data handling on their device.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">9. Misuse of the System</h3>
        <p>Users must not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the system to falsify inspection results.</li>
          <li>Intentionally manipulate inputs to produce misleading outputs.</li>
          <li>Use the system outside its intended purpose (meat inspection support).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">10. Liability Disclaimer</h3>
        <p>The developers of MeatLens are not responsible for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Incorrect inspection outcomes resulting from misuse.</li>
          <li>Decisions made solely based on system output.</li>
          <li>Damages, losses, or regulatory actions arising from improper reliance.</li>
        </ul>
        <p>Use of the system is at the user&apos;s discretion and responsibility.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">11. Updates and Improvements</h3>
        <p>The system may be updated periodically to improve detection accuracy, expand scenarios, and fix issues.</p>
        <p>Users are encouraged to use the latest available version.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">12. Governing Law</h3>
        <p>These Terms are governed by the laws of the Republic of the Philippines.</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold">13. Acknowledgment</h3>
        <p>By using MeatLens, you confirm that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>You understand it is an AI-assisted tool, not a final authority.</li>
          <li>You will apply professional inspection standards at all times.</li>
          <li>You accept full responsibility for decisions made during inspections.</li>
        </ul>
      </section>

      <p className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs font-medium">
        MeatLens: Supporting inspectors, not replacing them.
      </p>
    </article>
  );
}
