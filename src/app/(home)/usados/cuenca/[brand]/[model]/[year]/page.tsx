"use client";

import { useParams } from "next/navigation";
import { CarDetailView } from "@/components/features/buyCar/CarDetailView";
import { vehicleLookupKeyFromSegments } from "@/lib/inventario/vehicle-public-slug";

export default function UsadosCuencaVehicleDetailPage() {
  const params = useParams();
  const brand = String(params?.brand ?? "");
  const model = String(params?.model ?? "");
  const year = String(params?.year ?? "");
  const lookupKey = vehicleLookupKeyFromSegments(brand, model, year);

  return <CarDetailView lookupKey={lookupKey} />;
}
