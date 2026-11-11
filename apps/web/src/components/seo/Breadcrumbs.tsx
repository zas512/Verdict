import Link from "next/link";
import { siteUrl } from "@/config/site";

export interface BreadcrumbItem {
  /** Visible label. */
  name: string;
  /** Path or absolute URL. */
  href: string;
}

/**
 * Breadcrumb trail + BreadcrumbList JSON-LD.
 *
 * Renders accessible navigation markup and the schema.org breadcrumb data
 * search engines use for rich results. Use `<Breadcrumbs items={...}/>` inside
 * pages or layouts; the last item is the current page (aria-current="page").
 */
export function Breadcrumbs({
  items,
  className
}: Readonly<{ items: readonly BreadcrumbItem[]; className?: string }>) {
  if (items.length === 0) return null;

  const toAbsolute = (href: string) =>
    href.startsWith("http") ? href : `${siteUrl}${href.startsWith("/") ? href : `/${href}`}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsolute(item.href)
    }))
  };

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className={className ?? "text-muted-foreground text-xs font-medium"}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.href}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true">/</span>}
                {isLast ? (
                  <span aria-current="page" className="text-foreground/80">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-foreground hover:underline">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
