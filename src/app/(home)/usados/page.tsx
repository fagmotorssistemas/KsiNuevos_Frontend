import { redirect } from "next/navigation";
import { VEHICLES_CATALOG_PATH } from "@/lib/inventario/vehicle-public-slug";

export default function UsadosIndexPage() {
  redirect(VEHICLES_CATALOG_PATH);
}
