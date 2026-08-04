/**
 * Content moderation pipeline for HealConnect.
 *
 * Scans chat messages and call transcripts for:
 *  - Phone numbers (off-platform contact attempts) — Task 7
 *  - Harassment keywords
 *  - Self-harm mention keywords
 *
 * Policy: NEVER auto-block or auto-censor messages. All flagged content is
 * queued for human review (FlaggedContent table). Clinical/safety judgment
 * is always left to a human reviewer.
 *
 * Scope: only add new detection patterns here. Do not modify unrelated logic.
 */

import { prisma } from './prisma';
import { containsPhoneNumber } from './validators';

export type ModerationSource = 'CHAT' | 'CALL_TRANSCRIPT';

export type FlagReason =
  | 'PHONE_NUMBER'
  | 'OFF_PLATFORM_CONTACT'
  | 'HARASSMENT'
  | 'SELF_HARM';

export interface ScanResult {
  flagged: boolean;
  reasons: FlagReason[];
  snippet: string; // excerpt of the matched portion (max 200 chars)
}

export interface ModerationContext {
  sessionId?: string;
  userId?: string;
  practitionerId?: string;
  chatMessageId?: string;
  transcriptId?: string;
}

// ─── Keyword lists (for human-review flagging only — not auto-blocking) ────────

// Harassment indicators — very conservative to minimize false positives
const HARASSMENT_KEYWORDS: RegExp[] = [
  /\b(threaten|kill\s+you|hurt\s+you|i['']ll\s+find\s+you)\b/i,
  /\b(abuse|harass|stalk)\b/i,
];

// Self-harm mention triggers — flag for human review
const SELF_HARM_KEYWORDS: RegExp[] = [
  /\b(suicide|suicidal|end\s+my\s+life|kill\s+myself|self[\s\-]harm|cutting\s+myself)\b/i,
  /\b(want\s+to\s+die|don['']t\s+want\s+to\s+live)\b/i,
];

// ─── Core scan function ────────────────────────────────────────────────────────

/**
 * Scans `text` for policy violations. Returns a ScanResult with all reasons.
 * Does NOT persist anything — call `createFlaggedContentRecord` to persist.
 */
export function scanContent(text: string): ScanResult {
  const reasons: FlagReason[] = [];
  let snippet = text.slice(0, 200);

  // 1. Phone number / off-platform contact (Task 7)
  if (containsPhoneNumber(text)) {
    reasons.push('PHONE_NUMBER');
    reasons.push('OFF_PLATFORM_CONTACT');
  }

  // 2. Harassment
  for (const pattern of HARASSMENT_KEYWORDS) {
    if (pattern.test(text)) {
      reasons.push('HARASSMENT');
      break;
    }
  }

  // 3. Self-harm mentions
  for (const pattern of SELF_HARM_KEYWORDS) {
    if (pattern.test(text)) {
      reasons.push('SELF_HARM');
      break;
    }
  }

  return {
    flagged: reasons.length > 0,
    reasons,
    snippet,
  };
}

/**
 * Persists a FlaggedContent record for each unique reason found in the scan.
 * Call this asynchronously (fire-and-forget) so it never blocks message delivery.
 *
 * @param text    Original message text
 * @param source  "CHAT" or "CALL_TRANSCRIPT"
 * @param context Session/user/message identifiers for traceability
 */
export async function flagContentIfNeeded(
  text: string,
  source: ModerationSource,
  context: ModerationContext
): Promise<void> {
  const result = scanContent(text);
  if (!result.flagged) return;

  // One FlaggedContent record per reason
  for (const reason of result.reasons) {
    try {
      await prisma.flaggedContent.create({
        data: {
          source,
          contentSnippet: result.snippet,
          reason,
          status: 'PENDING',
          userId: context.userId ?? null,
          practitionerId: context.practitionerId ?? null,
          sessionId: context.sessionId ?? null,
          chatMessageId: context.chatMessageId ?? null,
          transcriptId: context.transcriptId ?? null,
        },
      });
    } catch (err) {
      // Log but never throw — moderation must not break core functionality
      console.error('[moderation] Failed to persist FlaggedContent:', err);
    }
  }
}
