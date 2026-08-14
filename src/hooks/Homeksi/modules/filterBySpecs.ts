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

type TransmissionClass = "automatica" | "manual";

function stripAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classifyFromText(text: string): TransmissionClass | null {
  const t = stripAccents(text);
  const isAuto =
    /\b(automatica|automatico|automatic|cvt|tiptronic|dsg|at)\b/.test(t) ||
    /\bt\/?a\b/.test(t) ||
    /\bta\b/.test(t);
  const isManual =
    /\b(manual|mt)\b/.test(t) ||
    /\bt\/?m\b/.test(t) ||
    /\btm\b/.test(t);

  if (isAuto && !isManual) return "automatica";
  if (isManual && !isAuto) return "manual";
  if (isAuto && isManual) {
    const hasTa = /\bt\/?a\b/.test(t) || /\bta\b/.test(t) || /\bcvt\b/.test(t);
    const hasTm = /\bt\/?m\b/.test(t) || /\btm\b/.test(t);
    if (hasTa && !hasTm) return "automatica";
    if (hasTm && !hasTa) return "manual";
    return "automatica";
  }
  return null;
}

function classifyCarTransmission(car: InventoryCar): TransmissionClass | null {
  if (car.transmission?.trim()) {
    const fromColumn = classifyFromText(car.transmission);
    if (fromColumn) return fromColumn;
  }
  return classifyFromText([car.model, car.version].filter(Boolean).join(" "));
}

function selectedTransmissionClass(label: string): TransmissionClass | null {
  const t = stripAccents(label);
  if (t.includes("manual")) return "manual";
  if (t.includes("automat")) return "automatica";
  return null;
}

export const filterBySpecs = (cars: InventoryCar[], filters: SpecsFilter): InventoryCar[] => {
  return cars.filter((car) => {
    
    // 1. Filtro de Año
    if (filters.minYear && car.year < filters.minYear) return false;
    if (filters.maxYear && car.year > filters.maxYear) return false;

    // 2. Filtro de Kilometraje
    const mileage = car.mileage || 0;
    if (filters.minMileage && mileage < filters.minMileage) return false;
    if (filters.maxMileage && mileage > filters.maxMileage) return false;

    // 3. Filtro de Transmisión
    if (filters.transmission && filters.transmission.length > 0) {
      const wanted = new Set(
        filters.transmission
          .map(selectedTransmissionClass)
          .filter((v): v is TransmissionClass => v !== null)
      );
      const carClass = classifyCarTransmission(car);
      if (!carClass || !wanted.has(carClass)) return false;
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