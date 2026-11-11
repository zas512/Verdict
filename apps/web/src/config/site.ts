/**
 * Central site configuration. Update NEXT_PUBLIC_SITE_URL in production;
 * the fallback is fine for local development.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export const siteName = "Verdict";

export const siteTagline = "The Practice, Organized";

export const siteDescription =
  "Verdict is law-firm management software: matters and case management, contacts, tasks, attendance, leave, expenses, and AI-powered legal document analysis.";

/** Default Open Graph / Twitter image served from /public. */
export const defaultOgImage = "/login.webp";

export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Verdict Technologies",
  alternateName: "Verdict",
  url: siteUrl,
  logo: `${siteUrl}/logo_verdict.png`,
  description: siteDescription,
  sameAs: [] as string[]
} as const;
