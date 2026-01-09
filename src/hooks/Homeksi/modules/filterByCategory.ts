import type { InventoryCar } from "../useInventoryData";

export const filterByCategory = (cars: InventoryCar[], categories: string[]): InventoryCar[] => {
  // Si el array de categorías está vacío, devolvemos todo
  if (!categories || categories.length === 0) return cars;

  // Normalizamos a minúsculas para comparar seguro
  const lowerCategories = categories.map(c => c.toLowerCase());

  return cars.filter((car) => {
    if (!car.type_body) return false;
    return lowerCategories.includes(car.type_body.toLowerCase());
  });
};