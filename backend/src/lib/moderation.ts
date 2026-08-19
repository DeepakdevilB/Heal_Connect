import { prisma } from './prisma';

const FLAGGED_KEYWORDS = [
  'abuse', 'fraud', 'scam', 'fake', 'illegal', 'violence', 'threat', 'spam',
];

export function scanContent(text: string): { flagged: boolean; reasons: string[] } {
  const lower = text.toLowerCase();
  const reasons = FLAGGED_KEYWORDS.filter((kw) => lower.includes(kw));
  return { flagged: reasons.length > 0, reasons };
}

export async function flagContentIfNeeded(
  content: string,
  source: string,
  meta: { sessionId?: string; userId?: string; practitionerId?: string; transcriptId?: string }
): Promise<void> {
  const { flagged, reasons } = scanContent(content);
  if (!flagged) return;

  await prisma.flaggedContent.create({
    data: {
      source,
      contentSnippet: content.slice(0, 500),
      reason: reasons.join(', '),
      status: 'PENDING',
      sessionId: meta.sessionId ?? null,
      userId: meta.userId ?? null,
      practitionerId: meta.practitionerId ?? null,
      transcriptId: meta.transcriptId ?? null,
    },
  });
}
