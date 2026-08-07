'use client';

import { useState } from 'react';
import { Star, X, Send, Loader2 } from 'lucide-react';
import { tokenStore } from '@/lib/api';

interface Props {
  open: boolean;
  practitionerId: string;
  practitionerName: string;
  sessionId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReviewModal({ open, practitionerId, practitionerName, sessionId, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return; }
    const token = tokenStore.getAccess();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/practitioners/${practitionerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined, sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(onSubmitted, 1500);
      } else {
        setError(data.message || 'Failed to submit review');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  const activeRating = hovered || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
            </div>
            <p className="font-bold text-lg text-gray-900">Review Submitted!</p>
            <p className="text-sm text-gray-500 mt-1">Thank you for your feedback.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <p className="font-bold text-lg text-gray-900">Rate your session</p>
              <p className="text-sm text-gray-500 mt-1">How was your experience with <span className="font-semibold text-amber-600">{practitionerName}</span>?</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= activeRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p className="text-center text-sm font-semibold text-amber-600 mb-4 h-5">
              {activeRating > 0 ? labels[activeRating] : ''}
            </p>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>

            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
