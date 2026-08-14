'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { agoraApi, sessionsApi, tokenStore } from '@/lib/api';
import type { TranscriptStatus } from '@/hooks/useDeepgramTranscription';

const ISSUES = ['Echo', 'Lag', 'Dropped call', 'Low volume', 'Background noise'];

interface Props {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  transcriptStatus?: TranscriptStatus;
}

export default function CallFeedbackModal({ sessionId, open, onClose, transcriptStatus }: Props) {
  const [audioQuality, setAudioQuality] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggleIssue = (issue: string) =>
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );

  const submit = async () => {
    if (!audioQuality || !overallRating) return;
    setSubmitting(true);
    const token = tokenStore.getAccess();
    if (token) {
      // 1. Submit call feedback
      await agoraApi.submitFeedback(token, {
        sessionId,
        audioQuality,
        overallRating,
        issues: selectedIssues,
        comment: comment.trim() || undefined,
      }).catch(console.error);

      // 2. Submit manual transcript if entered as fallback
      if (manualTranscript.trim() && transcriptStatus !== 'saved') {
        await sessionsApi.submitTranscript(token, sessionId, manualTranscript.trim()).catch(console.error);
      }
    }
    setDone(true);
    setSubmitting(false);
    setTimeout(onClose, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🙏</p>
            <p className="font-semibold">Thanks for your feedback!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Auto-transcript status indicator */}
            {transcriptStatus === 'saved' && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <span>🎙️</span>
                <span>Call transcript recorded and saved to session history.</span>
              </div>
            )}

            <div>
              <p className="font-semibold text-sm mb-1">How was the session?</p>
              <StarRow value={overallRating} onChange={setOverallRating} />
            </div>

            <div>
              <p className="font-semibold text-sm mb-1">Audio quality?</p>
              <StarRow value={audioQuality} onChange={setAudioQuality} />
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Any issues? (optional)</p>
              <div className="flex flex-wrap gap-2">
                {ISSUES.map((issue) => (
                  <button
                    key={issue}
                    onClick={() => toggleIssue(issue)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedIssues.includes(issue)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any other comments? (optional)"
              rows={2}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* Fallback manual transcript entry when STT wasn't saved */}
            {transcriptStatus !== 'saved' && (
              <div className="pt-1 border-t border-border/50">
                {!showManualTranscript ? (
                  <button
                    type="button"
                    onClick={() => setShowManualTranscript(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Add manual transcript / session notes
                  </button>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Session Transcript / Notes (Manual Fallback)
                    </label>
                    <textarea
                      value={manualTranscript}
                      onChange={(e) => setManualTranscript(e.target.value)}
                      placeholder="Type or paste conversation transcript / notes..."
                      rows={3}
                      className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={onClose}>Skip</Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={!audioQuality || !overallRating || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-xl transition-transform hover:scale-110 ${star <= value ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
