import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/login", "/register"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    priority: route === "" ? 1 : 0.5,
  }));
}
