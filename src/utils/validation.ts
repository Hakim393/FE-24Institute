// Validation helpers adhering strictly to 24Institute backend contracts

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  // Password 8–128 characters, not trimmed according to backend contract
  if (typeof password !== 'string') return false;
  return password.length >= 8 && password.length <= 128;
}

export function isValidFullName(name: string): boolean {
  // Full name 3-150 characters
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 150;
}

export function isValidOtpCode(code: string): boolean {
  // 6 digits string, leading zeros permitted
  if (typeof code !== 'string') return false;
  return /^\d{6}$/.test(code.trim());
}

export function isValidWhatsAppInviteUrl(url: string): boolean {
  // Must be https://chat.whatsapp.com/... per backend validation rule
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+$/.test(trimmed);
}

export function isValidCertificateNumber(certNum: string): boolean {
  // 24I- + 36 uppercase hex chars
  if (!certNum || typeof certNum !== 'string') return false;
  return /^24I-[A-F0-9]{36}$/.test(certNum.trim());
}

export function isValidDecimalPrice(price: string): boolean {
  // Valid decimal string for price
  if (!price || typeof price !== 'string') return false;
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0;
}
