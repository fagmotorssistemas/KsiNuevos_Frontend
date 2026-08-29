import type { MetadataRoute } from "next";
import { fetchSitemapInventory } from "@/lib/seo/fetch-public-inventory";
import { SITE_URL } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const { cars, brands } = await fetchSitemapInventory();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/cuenca-azuay`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/usados/cuenca`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/vender/cuenca`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/creditos/cuenca`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/nosotros/cuenca`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const brandPages: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: `${SITE_URL}${brand.path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const vehiclePages: MetadataRoute.Sitemap = cars.map((car) => ({
    url: `${SITE_URL}${car.path}`,
    lastModified: car.lastModified,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticPages, ...brandPages, ...vehiclePages];
}
