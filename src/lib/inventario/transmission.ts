const TRANSMISSION_CODES: Record<string, string> = {
  tm: 'manual',
  mt: 'manual',
  ta: 'automática',
  at: 'automática',
  cvt: 'cvt',
};

export function normalizeTransmission(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().toLowerCase();
  if (!text || text === '.') return null;
  return TRANSMISSION_CODES[text.replace(/[^a-z]/g, '')] ?? text;
}
