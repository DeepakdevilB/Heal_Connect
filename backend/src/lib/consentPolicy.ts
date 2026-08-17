import type { Prisma } from '@prisma/client';

/**
 * Bump this whenever the Terms of Service or Privacy Notice wording changes
 * materially — it's stamped onto every consent decision so we can always
 * answer "what exactly did this person agree to, and when" (an evidentiary
 * requirement, not just a nice-to-have), even after the current wording is
 * edited later.
 */
export const CURRENT_POLICY_VERSION = '2026-08-17';

interface RegistrationConsentInput {
  userId?: string | undefined;
  practitionerId?: string | undefined;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  emailMarketingOptIn?: boolean | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

/**
 * Builds the Consent rows captured at signup — always separate rows, never
 * one bundled "I agree to Terms, Privacy Policy and Marketing" checkbox.
 * Pure (no DB access) so it can be used inside a Prisma transaction alongside
 * the user/practitioner insert — the account and its consent evidence should
 * be created atomically, not as a fire-and-forget side effect that could
 * silently fail and leave an account with no consent record at all.
 */
export function buildRegistrationConsentRows(
  input: RegistrationConsentInput
): Prisma.ConsentCreateManyInput[] {
  const base = {
    userId: input.userId ?? null,
    practitionerId: input.practitionerId ?? null,
    source: 'REGISTRATION',
    policyVersion: CURRENT_POLICY_VERSION,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  const rows: Prisma.ConsentCreateManyInput[] = [
    { ...base, category: 'TERMS', granted: input.acceptTerms },
    { ...base, category: 'PRIVACY_NOTICE', granted: input.acceptPrivacy },
  ];

  if (input.emailMarketingOptIn !== undefined) {
    rows.push({ ...base, category: 'EMAIL_MARKETING', granted: input.emailMarketingOptIn });
  }

  return rows;
}
