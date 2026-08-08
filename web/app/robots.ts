import type { MetadataRoute } from "next";
import { canonical } from "@/server/lib/seo";

/**
 * robots.txt.
 *
 * The disallow list is short on purpose. `robots.txt` is a public file: every path
 * listed here is a path an attacker now knows exists. It carries the two directories
 * that are genuinely not content — the API and the portal — and nothing that is merely
 * private, because privacy is enforced by authorisation, not by asking politely.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/portal/"],
    },
    sitemap: canonical("/sitemap.xml"),
    host: canonical("/"),
  };
}
