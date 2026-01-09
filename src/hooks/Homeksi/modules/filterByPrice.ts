import type { InventoryCar } from "../useInventoryData";

export const filterByPrice = (
  cars: InventoryCar[], 
  minPrice: number | null, 
  maxPrice: number | null
): InventoryCar[] => {
  let filtered = cars;

  if (minPrice !== null && minPrice > 0) {
    filtered = filtered.filter((car) => car.price >= minPrice);
  }

  if (maxPrice !== null && maxPrice > 0) {
    filtered = filtered.filter((car) => car.price <= maxPrice);
  }

  return filtered;
};