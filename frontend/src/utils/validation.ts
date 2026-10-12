/**
 * Frontend validation and format verification utilities.
 */

/**
 * Validates whether an email address adheres to RFC standard format.
 * Rejects common placeholders and missing indicators.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  if (['not found', 'none', 'null', 'unknown', 'n/a', ''].includes(cleaned)) {
    return false;
  }
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return emailRegex.test(cleaned);
}

/**
 * Counts words in a string, stripping excess whitespace.
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Validates if the email pitch satisfies the strict 60–90 word range.
 */
export function isEmailWordCountValid(body: string): boolean {
  const count = countWords(body);
  return count >= 60 && count <= 90;
}

/**
 * Validates if the Instagram DM satisfies the strict 15–30 word range.
 */
export function isDmWordCountValid(dm: string): boolean {
  const count = countWords(dm);
  return count >= 15 && count <= 30;
}

/**
 * Checks whether a creator falls within the micro-influencer subscriber window (5,000–100,000).
 */
export function isMicroInfluencerTier(subscriberCount: number | null): boolean {
  if (subscriberCount === null || subscriberCount === undefined) return false;
  return subscriberCount >= 5000 && subscriberCount <= 100000;
}

/**
 * Formats a metric value, cleanly distinguishing missing values ('Unavailable') from 0.
 */
export function formatMetric(val: number | null | undefined, suffix: string = ''): string {
  if (val === null || val === undefined) return 'Unavailable';
  return `${Number(val).toLocaleString()}${suffix}`;
}
