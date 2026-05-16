export interface WrapUntrustedOptions {
  maxChars?: number;
}

const defaultMaxUntrustedChars = 4000;
const delimiterPattern = /<\/?UNTRUSTED_DATA\b[^>]*>?/giu;

export function sanitizeUntrustedText(text: string): string {
  return text.replace(delimiterPattern, '[delimiter-stripped]');
}

export function sanitizeUntrustedKind(kind: string): string {
  const sanitized = kind.toLowerCase().replace(/[^a-z0-9_-]+/gu, '_').replace(/^_+|_+$/gu, '');
  return sanitized || 'data';
}

export function wrapUntrusted(kind: string, text: string, options: WrapUntrustedOptions = {}): string {
  const maxChars = options.maxChars ?? defaultMaxUntrustedChars;
  const sanitizedKind = sanitizeUntrustedKind(kind);
  const sanitizedText = sanitizeUntrustedText(text);
  const truncated = maxChars >= 0 && sanitizedText.length > maxChars
    ? `${sanitizedText.slice(0, maxChars)}[truncated]`
    : sanitizedText;

  return `<UNTRUSTED_DATA kind="${sanitizedKind}">\n${truncated}\n</UNTRUSTED_DATA>`;
}
