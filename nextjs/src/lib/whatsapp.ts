import { contact as contactFallback } from '@/data/content';

export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('965')) return digits;
  if (digits.startsWith('0')) return `965${digits.slice(1)}`;
  return `965${digits}`;
}

export function primaryContactPhone(phones?: string[] | null): string {
  const list = phones?.length ? phones : contactFallback.phones;
  return normalizeWhatsAppPhone(list[0] ?? '51152474');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
