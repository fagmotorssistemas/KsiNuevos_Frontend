import { VehiclesCatalogView } from "@/components/features/buyCar/VehiclesCatalogView";
import { JsonLd } from "@/lib/seo/JsonLd";
import {
  buildCatalogJsonLd,
  fetchSitemapInventory,
} from "@/lib/seo/fetch-public-inventory";
import { CATALOG_SEO, catalogMetadata } from "@/lib/seo/public-copy";

export const revalidate = 3600;

export function generateMetadata() {
  return catalogMetadata();
}

export default async function UsadosCuencaPage() {
  const { cars } = await fetchSitemapInventory();
  const jsonLd = buildCatalogJsonLd(cars.map((car) => car.path));

  return (
    <>
      <JsonLd data={jsonLd} />
      <VehiclesCatalogView heading={CATALOG_SEO.h1} intro={CATALOG_SEO.intro} />
    </>
  );
}
