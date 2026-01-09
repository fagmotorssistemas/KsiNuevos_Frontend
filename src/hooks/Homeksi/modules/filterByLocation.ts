import type { InventoryCar } from "../useInventoryData";

export const filterByLocation = (cars: InventoryCar[], cities: string[]): InventoryCar[] => {
  if (!cities || cities.length === 0) return cars;

  const lowerCities = cities.map(c => c.toLowerCase());

  return cars.filter((car) => {
    // Si el auto no tiene ciudad registrada, decidimos si mostrarlo o no.
    // Aquí asumimos que no pasa el filtro si es null.
    if (!car.city_registration) return false;
    
    return lowerCities.includes(car.city_registration.toLowerCase());
  });
};