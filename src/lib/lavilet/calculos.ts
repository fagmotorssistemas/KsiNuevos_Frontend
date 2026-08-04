import { Proyecto } from "@/data/lavilet/proyectos";

export function calcularPrecioM2(precio: number, area: number): number {
  return precio / area;
}

export function obtenerPromedioMercado(proyectos: Proyecto[]): number {
  const proyectosMercado = proyectos.filter(p => !p.destacado);
  if (proyectosMercado.length === 0) return 0;
  
  const sumaPrecioM2 = proyectosMercado.reduce((acc, p) => acc + calcularPrecioM2(p.precio, p.areaInterna), 0);
  return sumaPrecioM2 / proyectosMercado.length;
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
