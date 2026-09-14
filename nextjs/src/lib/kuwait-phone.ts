/** يحوّل أي إدخال إلى +965XXXXXXXX أو فارغ */
export function normalizeKuwaitPhone(raw: string): string {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('965')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 8);
  return digits ? `+965${digits}` : '';
}

export function kuwaitLocalDigits(full: string): string {
  return normalizeKuwaitPhone(full).replace(/^\+965/, '');
}

export function isValidKuwaitMobile(full: string): boolean {
  const local = kuwaitLocalDigits(full);
  return /^[569]\d{7}$/.test(local);
}
