// src/utils/rastreo-format.ts

/**
 * Limpia cadenas de texto que vienen de base de datos (Oracle)
 * Elimina espacios al inicio/final y devuelve cadena vacía si es null/undefined
 */
export const limpiarTexto = (valor: string | undefined | null): string => {
    if (!valor) return '';
    return valor.toString().trim();
};

/**
 * Parsea valores monetarios o numéricos específicos del módulo de Rastreo.
 * - Maneja strings con comas como decimales (común en ciertos locales).
 * - Elimina caracteres no numéricos excepto el punto y la coma.
 */
export const parseMonedaGPS = (valor: any): number => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;

    const str = valor.toString().trim();
    
    // Tu lógica original en el servicio reemplazaba comas por puntos.
    // Ej: "150,00" -> "150.00"
    // Si tus datos vienen como "1,200.00" (miles), esto podría romperlo, 
    // pero mantenemos tu lógica original si así llega tu data.
    const limpio = str.replace(',', '.').replace(/[^0-9.]/g, ''); 
    
    const numero = parseFloat(limpio);
    return isNaN(numero) ? 0 : numero;
};

/**
 * Formateador visual para dinero (Visualización)
 */
export const formatDineroGPS = (cantidad: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(cantidad);
};