import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/**
 * Sitemap for the public, indexable surface of the app.
 *
 * Authenticated app routes are deliberately excluded: they require a session,
 * so listing them only wastes crawl budget and confuses Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes: Array<{
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
    priority: number;
  }> = [
    { path: "/privacy", changeFrequency: "yearly", priority: 0.5 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
    { path: "/register", changeFrequency: "monthly", priority: 0.6 }
  ];

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority
  }));
}
