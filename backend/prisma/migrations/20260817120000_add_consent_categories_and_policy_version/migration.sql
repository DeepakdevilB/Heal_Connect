-- GDPR: Consent model grows a policyVersion stamp (which wording of the
-- Terms/Privacy Notice was in effect when the decision was made) and its
-- category set expands beyond ANALYTICS/MARKETING to cover Terms acceptance,
-- Privacy Notice acknowledgement, explicit sensitive-data consent, and
-- separate email/SMS/push marketing channels — see schema.prisma Consent
-- model comment and lib/consentPolicy.ts.

ALTER TABLE "Consent" ADD COLUMN "policyVersion" TEXT;

-- Existing rows recorded under the old "MARKETING" category name are renamed
-- to "EMAIL_MARKETING" so they aren't orphaned once SMS_MARKETING and
-- PUSH_MARKETING exist as distinct categories alongside it.
UPDATE "Consent" SET category = 'EMAIL_MARKETING' WHERE category = 'MARKETING';
