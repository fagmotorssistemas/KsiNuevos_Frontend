import type { Database } from "@/types/supabase";
import type { InventoryCar } from "@/hooks/Homeksi/useInventoryData";
import { getEffectivePublicPrice } from "@/lib/inventario/inventory-pricing";
import { createServiceRoleClient } from "@/lib/supabase/server";

type OracleRow = Pick<
  Database["public"]["Tables"]["inventoryoracle"]["Row"],
  | "id"
  | "brand"
  | "model"
  | "year"
  | "mileage"
  | "price"
  | "internal_fixed_price"
  | "public_price_reverts_at"
  | "img_main_url"
  | "slug"
  | "created_at"
  | "registration_place"
>;

function isListable(car: OracleRow): boolean {
  const price = getEffectivePublicPrice({
    price: car.price,
    internal_fixed_price: car.internal_fixed_price ?? null,
    internal_fixed_price_set_at: null,
    public_price_changed_at: null,
    public_price_change_reason: null,
    public_price_reverts_at: car.public_price_reverts_at ?? null,
  });
  return (price ?? 0) > 0 && Boolean(car.img_main_url?.trim());
}

function toCardCar(car: OracleRow): InventoryCar {
  const price =
    getEffectivePublicPrice({
      price: car.price,
      internal_fixed_price: car.internal_fixed_price ?? null,
      internal_fixed_price_set_at: null,
      public_price_changed_at: null,
      public_price_change_reason: null,
      public_price_reverts_at: car.public_price_reverts_at ?? null,
    }) ?? car.price;

  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    year: car.year,
    color: null,
    type_body: null,
    transmission: null,
    mileage: car.mileage,
    price,
    internal_fixed_price: car.internal_fixed_price,
    public_price_reverts_at: car.public_price_reverts_at,
    img_main_url: car.img_main_url,
    slug: car.slug,
    features: null,
    specs: null,
    fuel_type: null,
    drive_type: null,
    passenger_capacity: null,
    cylinder_count: null,
    version: null,
    plate_short: null,
    aesthetic_condition: null,
    mechanical_condition: null,
    created_at: car.created_at,
    registration_place: car.registration_place,
    previous_owners: null,
  };
}

export type PopularInventoryPayload = {
  cars: InventoryCar[];
  stockCount: number;
};

export async function fetchPopularInventory(
  limit = 4
): Promise<PopularInventoryPayload> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("inventoryoracle")
      .select(
        "id, brand, model, year, mileage, price, internal_fixed_price, public_price_reverts_at, img_main_url, slug, created_at, registration_place"
      )
      .eq("status", "disponible");

    if (error) throw error;

    const available = (data ?? []).filter(isListable);
    if (available.length === 0) {
      return { cars: [], stockCount: 0 };
    }

    const ids = available.map((car) => car.id);
    const { data: interestData } = await supabase
      .from("interested_cars")
      .select("inventory_id")
      .in("inventory_id", ids);

    const leadCounts: Record<string, number> = {};
    interestData?.forEach((item) => {
      if (!item.inventory_id) return;
      leadCounts[item.inventory_id] = (leadCounts[item.inventory_id] || 0) + 1;
    });

    const ranked = [...available]
      .sort((a, b) => {
        const byLeads = (leadCounts[b.id] || 0) - (leadCounts[a.id] || 0);
        if (byLeads !== 0) return byLeads;
        const yearDiff = (b.year ?? 0) - (a.year ?? 0);
        if (yearDiff !== 0) return yearDiff;
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      })
      .slice(0, limit)
      .map(toCardCar);

    return { cars: ranked, stockCount: available.length };
  } catch (error) {
    console.error("fetchPopularInventory:", error);
    return { cars: [], stockCount: 0 };
  }
}
