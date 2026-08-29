import type { Database } from "@/types/supabase";
import { getEffectivePublicPrice } from "@/lib/inventario/inventory-pricing";
import {
  extractYearFromVehicleSlug,
  getVehiclePublicPath,
  getVehiclePublicSlug,
  isVehicleUuid,
  slugifyVehicleText,
} from "@/lib/inventario/vehicle-public-slug";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/site";

type OracleRow = Database["public"]["Tables"]["inventoryoracle"]["Row"];

function pickBestMatch(matches: OracleRow[]): OracleRow | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return matches.find((car) => car.status === "disponible") ?? matches[0];
}

function publicPrice(car: Pick<OracleRow, "price" | "internal_fixed_price" | "public_price_reverts_at">) {
  return getEffectivePublicPrice({
    price: car.price,
    internal_fixed_price: car.internal_fixed_price ?? null,
    internal_fixed_price_set_at: null,
    public_price_changed_at: null,
    public_price_change_reason: null,
    public_price_reverts_at: car.public_price_reverts_at ?? null,
  });
}

export async function fetchSitemapInventory() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("inventoryoracle")
      .select("id, brand, model, year, slug, created_at, status, img_main_url, price")
      .eq("status", "disponible")
      .not("brand", "is", null)
      .not("model", "is", null);

    if (error) throw error;

    const cars = (data ?? []).filter(
      (row) => Boolean(row.brand?.trim()) && Boolean(row.model?.trim()) && row.year
    );

    const brandSlugs = new Map<string, string>();
    for (const car of cars) {
      const slug = slugifyVehicleText(car.brand);
      if (slug && !brandSlugs.has(slug)) {
        brandSlugs.set(slug, car.brand.trim());
      }
    }

    return {
      cars: cars.map((car) => ({
        path: getVehiclePublicPath(car),
        lastModified: car.created_at ? new Date(car.created_at) : new Date(),
      })),
      brands: [...brandSlugs.entries()].map(([slug, label]) => ({
        slug,
        label,
        path: `/usados/cuenca/${slug}`,
      })),
    };
  } catch (error) {
    console.error("fetchSitemapInventory:", error);
    return { cars: [], brands: [] };
  }
}

export async function resolveBrandLabel(brandSlug: string): Promise<string> {
  const slug = slugifyVehicleText(brandSlug);
  const fallback = brandSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("inventoryoracle")
      .select("brand")
      .eq("status", "disponible");

    if (error) throw error;
    const match = (data ?? []).find(
      (row) => slugifyVehicleText(row.brand || "") === slug
    );
    return match?.brand?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchCarByLookupKey(
  lookupKey: string
): Promise<OracleRow | null> {
  try {
    const supabase = createServiceRoleClient();
    let decoded = lookupKey.trim();
    try {
      decoded = decodeURIComponent(decoded).trim();
    } catch {
      decoded = lookupKey.trim();
    }

    if (isVehicleUuid(decoded)) {
      const { data, error } = await supabase
        .from("inventoryoracle")
        .select("*")
        .eq("id", decoded)
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    const normalized = slugifyVehicleText(decoded);
    if (!normalized) return null;

    const { data: slugRows, error: slugError } = await supabase
      .from("inventoryoracle")
      .select("*")
      .eq("slug", normalized)
      .limit(10);

    if (slugError) throw slugError;
    const slugMatch = pickBestMatch((slugRows ?? []) as OracleRow[]);
    if (slugMatch) return slugMatch;

    const year = extractYearFromVehicleSlug(normalized);
    const brandGuess = normalized.split("-")[0];
    let query = supabase.from("inventoryoracle").select("*");
    if (year) query = query.eq("year", year);
    if (brandGuess && !/^\d+$/.test(brandGuess)) {
      query = query.ilike("brand", `${brandGuess}%`);
    }

    const { data: yearRows, error: yearError } = await query.limit(200);
    if (yearError) throw yearError;

    const computed = ((yearRows ?? []) as OracleRow[]).filter(
      (row) => getVehiclePublicSlug(row) === normalized
    );
    return pickBestMatch(computed);
  } catch (error) {
    console.error("fetchCarByLookupKey:", error);
    return null;
  }
}

export function vehicleOfferPrice(car: OracleRow): number | null {
  return publicPrice(car);
}

export function buildVehicleJsonLd(car: OracleRow) {
  const path = getVehiclePublicPath(car);
  const price = publicPrice(car);
  const name = `${car.brand} ${car.model} ${car.year ?? ""}`.replace(/\s+/g, " ").trim();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Autos usados en Cuenca",
            item: `${SITE_URL}/usados/cuenca`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: car.brand,
            item: `${SITE_URL}/usados/cuenca/${slugifyVehicleText(car.brand)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name,
            item: `${SITE_URL}${path}`,
          },
        ],
      },
      {
        "@type": "Car",
        name,
        brand: { "@type": "Brand", name: car.brand },
        model: car.model,
        vehicleModelDate: car.year ? String(car.year) : undefined,
        image: car.img_main_url || undefined,
        mileageFromOdometer: car.mileage
          ? {
              "@type": "QuantitativeValue",
              value: car.mileage,
              unitCode: "KMT",
            }
          : undefined,
        itemCondition: "https://schema.org/UsedCondition",
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}${path}`,
          priceCurrency: "USD",
          price: price ?? undefined,
          availability:
            car.status === "disponible"
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          itemCondition: "https://schema.org/UsedCondition",
          seller: {
            "@type": "AutoDealer",
            name: "K-si Nuevos",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Cuenca",
              addressRegion: "Azuay",
              addressCountry: "EC",
            },
          },
        },
      },
    ],
  };
}

export function buildCatalogJsonLd(paths: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Autos usados en Cuenca",
    itemListElement: paths.slice(0, 20).map((path, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${path}`,
    })),
  };
}
