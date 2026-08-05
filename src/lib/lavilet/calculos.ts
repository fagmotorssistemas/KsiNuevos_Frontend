import { Proyecto } from "@/data/lavilet/proyectos";

export function calcularPrecioM2(precio: number, area: number): number {
  return precio / area;
}

export function obtenerPromedioMercado(proyectos: Proyecto[]): number {
  // Retornamos el valor fijo solicitado de $2,024/m²
  return 2024;
}

export function calcularDiferenciaVsMercado(precioM2: number, promedioMercado: number): number {
  if (promedioMercado === 0) return 0;
  return ((precioM2 - promedioMercado) / promedioMercado) * 100;
}

export function clasificarPrecio(precioM2: number, promedioMercado: number): "Económico" | "Mercado" | "Premium" {
  const diferencia = calcularDiferenciaVsMercado(precioM2, promedioMercado);
  if (diferencia < -10) return "Económico";
  if (diferencia > 10) return "Premium";
  return "Mercado";
}
