/**
 * Normalize Nigerian and international phone numbers to E.164 (+234...).
 * Accepts: 08166411207, 8166411207, 2348166411207, +2348166411207
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Invalid phone number');
  }

  let normalized = digits;
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = `234${normalized.slice(1)}`;
  } else if (normalized.length === 10 && /^[789]/.test(normalized)) {
    normalized = `234${normalized}`;
  }

  if (!normalized.startsWith('234') || normalized.length !== 13) {
    throw new Error('Enter a valid Nigerian phone number');
  }

  return `+${normalized}`;
}

/** Termii expects numbers without +, e.g. 2348166411207 */
export function toTermiiPhone(e164: string): string {
  return e164.replace(/^\+/, '');
}
