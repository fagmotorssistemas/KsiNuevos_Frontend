import type { InventoryCar } from "../useInventoryData";

export const filterBySearch = (cars: InventoryCar[], query: string): InventoryCar[] => {
  // 1. Validación inicial igual que en tu hook antiguo
  if (!query || !query.trim()) {
    return cars;
  }

  // 2. Normalizamos la búsqueda
  const lowerQuery = query.toLowerCase();

  return cars.filter((car) => {
    // 3. Lógica EXACTA de 'useInventoryPublic':
    return (
      car.brand.toLowerCase().includes(lowerQuery) || 
      car.model.toLowerCase().includes(lowerQuery) ||
      (car.plate_short && car.plate_short.toLowerCase().includes(lowerQuery))
    );
  });
};