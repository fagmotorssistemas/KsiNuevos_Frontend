import { CarDetailView } from "@/components/features/buyCar/CarDetailView";
import { vehicleLookupKeyFromSegments } from "@/lib/inventario/vehicle-public-slug";
import { JsonLd } from "@/lib/seo/JsonLd";
import {
  buildVehicleJsonLd,
  fetchCarByLookupKey,
  fetchSitemapInventory,
  vehicleOfferPrice,
} from "@/lib/seo/fetch-public-inventory";
import { vehicleMetadata } from "@/lib/seo/public-copy";

export const revalidate = 3600;

type VehiclePageProps = {
  params: Promise<{ brand: string; model: string; year: string }>;
};

export async function generateStaticParams() {
  const { cars } = await fetchSitemapInventory();
  return cars.map((car) => {
    const parts = car.path.replace("/usados/cuenca/", "").split("/");
    return {
      brand: parts[0] ?? "",
      model: parts[1] ?? "",
      year: parts[2] ?? "",
    };
  }).filter((row) => row.brand && row.model && row.year);
}

export async function generateMetadata({ params }: VehiclePageProps) {
  const { brand, model, year } = await params;
  const lookupKey = vehicleLookupKeyFromSegments(brand, model, year);
  const car = await fetchCarByLookupKey(lookupKey);
  if (!car) {
    return vehicleMetadata({
      brand: decodeURIComponent(brand),
      model: decodeURIComponent(model),
      year,
      path: `/usados/cuenca/${brand}/${model}/${year}`,
    });
  }
  return vehicleMetadata({
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: vehicleOfferPrice(car),
    path: `/usados/cuenca/${brand}/${model}/${year}`,
  });
}

export default async function UsadosCuencaVehicleDetailPage({
  params,
}: VehiclePageProps) {
  const { brand, model, year } = await params;
  const lookupKey = vehicleLookupKeyFromSegments(brand, model, year);
  const car = await fetchCarByLookupKey(lookupKey);

  return (
    <>
      {car ? <JsonLd data={buildVehicleJsonLd(car)} /> : null}
      <CarDetailView lookupKey={lookupKey} />
    </>
  );
}
