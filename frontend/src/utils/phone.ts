/**
 * Normalize Nigerian phone numbers to E.164 (+234...) for Firebase Phone Auth.
 */
export function toE164Phone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Error('Invalid phone number');

  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits}`;
  }
  if (raw.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `+234${digits}`;
  }

  throw new Error('Enter a valid Nigerian phone number (e.g. 08166411207)');
}
