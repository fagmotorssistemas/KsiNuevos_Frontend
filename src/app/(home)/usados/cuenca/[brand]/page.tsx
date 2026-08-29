"use client";

import { useParams } from "next/navigation";
import { VehiclesCatalogView } from "@/components/features/buyCar/VehiclesCatalogView";
import { VehicleLegacyRedirect } from "@/components/features/buyCar/CarDetailView";
import {
  isLegacyHyphenVehicleSlug,
  isVehicleUuid,
} from "@/lib/inventario/vehicle-public-slug";

export default function UsadosCuencaBrandPage() {
  const params = useParams();
  const brand = decodeURIComponent(String(params?.brand ?? ""));

  if (isVehicleUuid(brand) || isLegacyHyphenVehicleSlug(brand)) {
    return <VehicleLegacyRedirect lookupKey={brand} />;
  }

  return <VehiclesCatalogView brandSlug={brand} />;
}
