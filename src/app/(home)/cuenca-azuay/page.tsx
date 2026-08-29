import CuencaAzuayHomeView from "./CuencaAzuayHomeView";
import { fetchPopularInventory } from "@/lib/home/popular-inventory";
import {
  buildCuencaJsonLd,
  buildCuencaMetadata,
} from "@/lib/seo/cuenca-landing";

export const revalidate = 3600;

export function generateMetadata() {
  return buildCuencaMetadata();
}

export default async function CuencaAzuayHomePage() {
  const { cars, stockCount } = await fetchPopularInventory(4);
  const jsonLd = buildCuencaJsonLd(cars, stockCount);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <CuencaAzuayHomeView popularCars={cars} stockCount={stockCount} />
    </>
  );
}
