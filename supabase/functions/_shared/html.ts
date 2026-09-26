// Escape text for HTML element content and quoted attribute values.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}
