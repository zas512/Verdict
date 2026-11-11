import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/**
 * Robots directives for the app.
 *
 * The dashboard is behind authentication, so we disallow it (crawling it just
 * renders auth-gated content); the public auth pages are indexable. The AI
 * sidebar and API routes are not public content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/privacy", "/login", "/register"],
        disallow: [
          "/",
          "/api/",
          "/dashboard",
          "/matters",
          "/clients",
          "/tasks",
          "/associates",
          "/attendance",
          "/leave",
          "/expenses",
          "/team",
          "/platform",
          "/search",
          "/setup"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
