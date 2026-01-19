// src/utils/numberToText.ts

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiun', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS_Y = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function miles(n: number): string {
  if (n === 0) return '';
  const d = Math.floor(n / 1000);
  const r = n % 1000;
  
  const strMiles = d === 1 ? 'mil' : (d > 1 ? centenas(d) + ' mil' : '');
  const strResto = r > 0 ? centenas(r) : '';

  return strMiles + (strMiles && strResto ? ' ' : '') + strResto;
}

function millones(n: number): string {
  const d = Math.floor(n / 1000000);
  const r = n % 1000000;

  const strMillones = d === 1 ? 'un millon' : (d > 1 ? centenas(d) + ' millones' : '');
  const strResto = r > 0 ? miles(r) : '';

  return strMillones + (strMillones && strResto ? ' ' : '') + strResto;
}

function centenas(n: number): string {
  if (n === 100) return 'cien';
  
  const c = Math.floor(n / 100);
  const r = n % 100;

  const strCentenas = CENTENAS[c];
  const strResto = r > 0 ? decenas(r) : '';

  return strCentenas + (strCentenas && strResto ? ' ' : '') + strResto;
}

function decenas(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 30) return DECENAS[n - 10]; // 10-29

  const d = Math.floor(n / 10);
  const u = n % 10;

  const strDecena = DECENAS_Y[d];
  const strUnidad = u > 0 ? ' y ' + UNIDADES[u] : '';

  return strDecena + strUnidad;
}

/**
 * Convierte un número a texto con formato legal de centavos.
 * Ejemplo: 1500.50 -> "MIL QUINIENTOS CON 50/100"
 */
export function numberToText(n: number): string {
  if (n === 0) return 'CERO CON 00/100';

  // 1. Aseguramos 2 decimales y convertimos a string
  // toFixed(2) redondea y nos da "1500.50"
  const parts = n.toFixed(2).split('.');
  
  const entero = parseInt(parts[0], 10);
  const decimales = parts[1]; // Siempre será dos dígitos, ej: "50", "05", "00"

  // 2. Convertimos la parte entera
  let texto = '';
  if (entero === 0) texto = 'CERO';
  else if (entero < 1000) texto = centenas(entero);
  else if (entero < 1000000) texto = miles(entero);
  else texto = millones(entero);

  // 3. Unimos con los centavos
  // Resultado: "TEXTO ENTERO CON XX/100"
  return `${texto.toUpperCase().trim()} CON ${decimales}/100`;
}