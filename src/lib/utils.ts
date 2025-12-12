/**
 * Formatea un número como una cadena de moneda en dólares.
 * @param amount El monto numérico (ej: 10.5, 25)
 * @returns Una cadena formateada (ej: "$10.50", "$25.00")
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea una fecha ISO a formato local legible
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * (¡NUEVO!) Calcula el precio final aplicando un porcentaje de descuento.
 * * @param originalPrice El precio base del producto.
 * @param discountPercent El porcentaje de descuento (ej: 10 para 10%).
 * * @returns Un objeto con el precio final, el original y flags útiles para la UI.
 */
export function calculatePrice(originalPrice: number, discountPercent: number = 0) {
  // Si no hay descuento o es negativo, devolvemos el precio normal
  if (!discountPercent || discountPercent <= 0) {
    return {
      finalPrice: originalPrice,
      originalPrice: originalPrice,
      discountAmount: 0,
      hasDiscount: false,
      percentage: 0,
    }
  }

  // Calculamos el descuento matemático
  const discountAmount = originalPrice * (discountPercent / 100)
  const finalPrice = originalPrice - discountAmount

  return {
    finalPrice: finalPrice, // El precio que paga el cliente (ej: 90.00)
    originalPrice: originalPrice, // El precio tachado (ej: 100.00)
    discountAmount: discountAmount, // Cuánto se ahorró (ej: 10.00)
    hasDiscount: true, // Para saber si mostramos el badge de oferta
    percentage: discountPercent, // Para mostrar "-10%"
  }
}