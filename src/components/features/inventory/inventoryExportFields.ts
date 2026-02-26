import type { InventoryCar } from "@/hooks/useInventory";

export type ExportFieldId = 
    | "plate_short" | "plate" | "brand" | "model" | "year" | "price" | "mileage"
    | "status" | "location" | "color" | "type_body" | "vin" | "transmission"
    | "fuel_type" | "created_at" | "description";

export interface ExportFieldConfig {
    id: ExportFieldId;
    label: string;
    getValue: (car: InventoryCar) => string | number | null | undefined;
}

const formatPrice = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '';

const formatKm = (v: number | null | undefined) =>
    v != null ? `${Number(v).toLocaleString()} km` : '';

const formatDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

export const INVENTORY_EXPORT_FIELDS: ExportFieldConfig[] = [
    { id: 'plate_short', label: 'Placa', getValue: (c) => c.plate_short || c.plate || 'S/P' },
    { id: 'plate', label: 'Placa (completa)', getValue: (c) => c.plate ?? '' },
    { id: 'brand', label: 'Marca', getValue: (c) => c.brand ?? '' },
    { id: 'model', label: 'Modelo', getValue: (c) => c.model ?? '' },
    { id: 'year', label: 'Año', getValue: (c) => c.year ?? '' },
    { id: 'price', label: 'Precio', getValue: (c) => formatPrice(c.price) },
    { id: 'mileage', label: 'Kilometraje', getValue: (c) => formatKm(c.mileage) },
    { id: 'status', label: 'Estado', getValue: (c) => (c.status ?? '').toString() },
    { id: 'location', label: 'Ubicación', getValue: (c) => (c.location ?? '').toString() },
    { id: 'color', label: 'Color', getValue: (c) => c.color ?? '' },
    { id: 'type_body', label: 'Tipo carrocería', getValue: (c) => c.type_body ?? '' },
    { id: 'vin', label: 'VIN', getValue: (c) => c.vin ?? '' },
    { id: 'transmission', label: 'Transmisión', getValue: (c) => c.transmission ?? '' },
    { id: 'fuel_type', label: 'Combustible', getValue: (c) => c.fuel_type ?? '' },
    { id: 'created_at', label: 'Fecha alta', getValue: (c) => formatDate(c.created_at) },
    { id: 'description', label: 'Descripción', getValue: (c) => (c.description ?? '').toString().slice(0, 200) },
];

export const DEFAULT_EXPORT_FIELD_IDS: ExportFieldId[] = [
    'plate_short', 'brand', 'model', 'year', 'price', 'mileage', 'status', 'location', 'color', 'type_body'
];
