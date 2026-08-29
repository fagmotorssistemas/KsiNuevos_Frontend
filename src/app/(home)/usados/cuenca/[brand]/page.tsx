import { VehicleLegacyRedirect } from "@/components/features/buyCar/CarDetailView";
import { VehiclesCatalogView } from "@/components/features/buyCar/VehiclesCatalogView";
import {
  isLegacyHyphenVehicleSlug,
  isVehicleUuid,
} from "@/lib/inventario/vehicle-public-slug";
import { fetchSitemapInventory, resolveBrandLabel } from "@/lib/seo/fetch-public-inventory";
import { brandCatalogMetadata, brandHeading } from "@/lib/seo/public-copy";

export const revalidate = 3600;

type BrandPageProps = {
  params: Promise<{ brand: string }>;
};

export async function generateStaticParams() {
  const { brands } = await fetchSitemapInventory();
  return brands.map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({ params }: BrandPageProps) {
  const { brand: raw } = await params;
  const brand = decodeURIComponent(raw ?? "");
  if (isVehicleUuid(brand) || isLegacyHyphenVehicleSlug(brand)) {
    return { robots: { index: false, follow: true } };
  }
  const label = await resolveBrandLabel(brand);
  return brandCatalogMetadata(label);
}

export default async function UsadosCuencaBrandPage({ params }: BrandPageProps) {
  const { brand: raw } = await params;
  const brand = decodeURIComponent(raw ?? "");

  if (isVehicleUuid(brand) || isLegacyHyphenVehicleSlug(brand)) {
    return <VehicleLegacyRedirect lookupKey={brand} />;
  }

  const label = await resolveBrandLabel(brand);
  const heading = brandHeading(label);

  return (
    <VehiclesCatalogView
      brandSlug={brand}
      heading={heading.h1}
      intro={heading.intro}
    />
  );
}
