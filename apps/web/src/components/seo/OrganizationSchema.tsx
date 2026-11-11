type OrganizationLike = {
  "@context": string;
  "@type": string;
  name: string;
  alternateName?: string;
  url: string;
  logo: string;
  description: string;
  sameAs?: readonly string[];
};

/**
 * Renders Organization JSON-LD for Google's knowledge graph signals.
 * Only used on public marketing-ish surfaces (privacy page, root layout).
 */
export function OrganizationSchema({ org }: { org: OrganizationLike }) {
  const data = { ...org, sameAs: [...(org.sameAs ?? [])] };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
