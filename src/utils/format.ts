// src/utils/format.ts

export const parseMoneda = (valor: string | number | undefined | null): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;

  // 1. Convertir a string
  // 2. .trim() elimina los espacios del inicio (" 386.00" -> "386.00")
  // 3. .replace elimina las comas de miles
  const limpio = valor.toString().trim().replace(/,/g, "");
  
  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : numero;
};

export const formatDinero = (cantidad: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cantidad);
};