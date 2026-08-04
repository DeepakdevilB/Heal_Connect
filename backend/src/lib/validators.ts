/**
 * Centralized regex validators for HealConnect.
 *
 * Rules:
 *  - PHONE_REGEX: matches any digit sequence that resembles a phone number —
 *    10-digit Indian numbers, with/without +91/country code, spaces, or dashes.
 *  - EMAIL_REGEX: RFC-5321-compatible email, used at signup validation.
 *
 * Only touch this file if you are tightening/extending regex validation for
 * existing purposes. Do NOT add unrelated validation logic here.
 */

/**
 * Detects phone-number patterns:
 *  - Optional leading + and 1-3 digit country code (e.g. +91, +1)
 *  - Optional separators (spaces, dashes, dots)
 *  - 10-digit Indian mobile numbers (starting 6-9)
 *  - Generic 7-15 digit sequences that look like phone numbers
 *
 * The regex is intentionally broad so off-platform contact attempts are
 * flagged for human review rather than silently allowed.
 */
export const PHONE_REGEX =
  /(?:\+?\d[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d/g;

/**
 * Strict 10-digit Indian mobile number (starts with 6, 7, 8, or 9),
 * with optional +91 prefix and optional separators.
 */
export const INDIAN_PHONE_REGEX =
  /(?:\+91[\s\-.]?)?[6-9]\d{9}/g;

/**
 * Standard email regex — used for signup field validation.
 * Matches the vast majority of valid RFC-5321 email addresses.
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Returns true if the given text contains any sequence that resembles
 * a phone number (Indian mobile or generic international format).
 *
 * Used by the moderation layer to flag chat messages and call transcripts.
 */
export function containsPhoneNumber(text: string): boolean {
  // Reset lastIndex for global regexes before testing
  PHONE_REGEX.lastIndex = 0;
  INDIAN_PHONE_REGEX.lastIndex = 0;

  // Check Indian numbers first (tighter match)
  const indianMatch = new RegExp(INDIAN_PHONE_REGEX.source).test(text);
  if (indianMatch) return true;

  // Generic phone pattern — require at least 7 consecutive digit characters
  // (possibly separated by spaces/dashes) to avoid false positives on IDs/dates
  const stripped = text.replace(/[\s\-().+]/g, '');
  const digitSequences = stripped.match(/\d+/g) ?? [];
  const hasLongDigitRun = digitSequences.some((seq) => seq.length >= 7);
  if (!hasLongDigitRun) return false;

  const generalMatch = new RegExp(PHONE_REGEX.source).test(text);
  return generalMatch;
}

/**
 * Returns true if the email address passes basic format validation.
 * This is a lightweight client-side-style check; the canonical validation
 * is done by express-validator's `isEmail()` at the route level.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
