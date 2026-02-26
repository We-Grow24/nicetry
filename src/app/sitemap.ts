import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://zyntrix.ai";
  const now = new Date();

  const staticRoutes = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/gallery", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/credits", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/community", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/game", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/anime", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/saas", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/video", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/create", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/signin", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/signup", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
