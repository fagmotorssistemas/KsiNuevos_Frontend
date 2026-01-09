import type { InventoryCar } from "../useInventoryData";

export type SpecsFilter = {
  minYear?: number;
  maxYear?: number;
  minMileage?: number;
  maxMileage?: number;
  transmission?: string[]; // Ej: ['Automática', 'Manual']
  fuelType?: string[];     // Ej: ['Gasolina', 'Híbrido']
  colors?: string[];       // Ej: ['Blanco', 'Negro']
};

export const filterBySpecs = (cars: InventoryCar[], filters: SpecsFilter): InventoryCar[] => {
  return cars.filter((car) => {
    
    // 1. Filtro de Año
    if (filters.minYear && car.year < filters.minYear) return false;
    if (filters.maxYear && car.year > filters.maxYear) return false;

    // 2. Filtro de Kilometraje
    const mileage = car.mileage || 0;
    if (filters.minMileage && mileage < filters.minMileage) return false;
    if (filters.maxMileage && mileage > filters.maxMileage) return false;

    // 3. Filtro de Transmisión (Array)
    if (filters.transmission && filters.transmission.length > 0) {
      if (!car.transmission || !filters.transmission.includes(car.transmission)) {
        return false;
      }
    }

    // 4. Filtro de Combustible (Array)
    if (filters.fuelType && filters.fuelType.length > 0) {
      if (!car.fuel_type || !filters.fuelType.includes(car.fuel_type)) {
        return false;
      }
    }

    // 5. Filtro de Color (Array)
    if (filters.colors && filters.colors.length > 0) {
      // Normalizamos porque a veces guardan "Blanco " con espacio
      const carColor = car.color?.trim().toLowerCase() || "";
      const hasMatch = filters.colors.some(c => c.toLowerCase() === carColor);
      if (!hasMatch) return false;
    }

    return true; // Pasó todas las pruebas
  });
};