"use client";

import { useParams } from "next/navigation";
import { VehicleLegacyRedirect } from "@/components/features/buyCar/CarDetailView";

export default function LegacyAutoRedirectPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  return <VehicleLegacyRedirect lookupKey={id} />;
}
