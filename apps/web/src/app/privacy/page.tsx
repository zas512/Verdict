import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Verdict",
  description: "Privacy and compliance information for Pakistan, USA, UK, and Australia.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <header className="mb-12 border-b border-[#0B1221]/10 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-6 w-6 text-[#C5A059]" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-[#C5A059]">Compliance</span>
        </div>
        <h1 className="font-heading text-4xl font-bold text-[#0B1221]">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#0B1221]/60">Effective: 2026-09-29 · Applies: Pakistan · USA · UK · Australia</p>
      </header>

      <section className="mb-10">
        <h2 className="font-heading text-2xl font-bold text-[#0B1221] mb-4">1. What We Collect</h2>
        <p className="text-sm leading-7 text-[#1A2332]/80 mb-3">
          We collect only the data required to provide legal-document analysis: your message, document uploads, and matter context (`matter_id`).
          PII masking is enabled by default (`mask_pii=True`). Log retention is 30 days. Uploaded files are retained per `retention_days` (default 30) and can be deleted via `{"/matters/{id}/data"}`.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-heading text-2xl font-bold text-[#0B1221] mb-4">2. Jurisdiction Coverage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { country: "Pakistan", law: "PDPA 2023", note: "Data localized; consent required; breach notification within 72h." },
            { country: "USA", law: "CCPA / CPRA / State patchwork", note: "Notice at collection; opt-out of sale/sharing; retention limits disclosed." },
            { country: "UK", law: "UK GDPR + DPA 2018", note: "Lawful basis documented; data-subject rights available on request." },
            { country: "Australia", law: "Privacy Act 1988 (APPs)", note: "APP 5 (notice), APP 8 (cross-border steps), APP 11 (security)." },
          ].map((item) => (
            <div key={item.country} className="rounded-sm border border-[#0B1221]/10 bg-[#F6F3EE]/50 p-4">
              <h3 className="font-heading text-base font-semibold text-[#0B1221]">{item.country}</h3>
              <p className="text-xs text-[#C5A059] font-medium mt-1">{item.law}</p>
              <p className="text-xs text-[#1A2332]/60 mt-2 leading-relaxed">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-heading text-2xl font-bold text-[#0B1221] mb-4">3. Cross-Border Transfers</h2>
        <p className="text-sm leading-7 text-[#1A2332]/80">
          By default, `OLLAMA_HOST` and `CHROMA_HOST` are set to `localhost` — no international data transfer occurs. If external hosts are configured,
          appropriate safeguards (adequacy, SCCs, or contractual terms) must be in place. For Pakistan (`PK_COMPLIANCE_MODE`), external hosts are blocked at startup.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-heading text-2xl font-bold text-[#0B1221] mb-4">4. Your Rights</h2>
        <ul className="list-disc pl-5 text-sm leading-7 text-[#1A2332]/80 space-y-1">
          <li>Access: request your data via our support channel.</li>
          <li>Erasure: use `{"DELETE /matters/{id}/data"}` or contact support.</li>
          <li>Portability: request an export of your embedded chunks.</li>
          <li>Objection / restriction: contact support for processing objections.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-heading text-2xl font-bold text-[#0B1221] mb-4">5. Contact</h2>
        <p className="text-sm leading-7 text-[#1A2332]/80">
          For privacy questions, data-subject requests, or breach reports: contact your organization administrator or refer to the linked security audit (`SECURITY_AUDIT.md`) and compliance documentation (`PRIVACY_AUDIT.md`).
        </p>
      </section>
    </main>
  );
}
