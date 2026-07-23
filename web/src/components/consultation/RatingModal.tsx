'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RatingModalProps {
  isOpen: boolean;
  astrologerName: string;
  onSubmitRating: (rating: number, comment?: string) => Promise<void>;
  onSkip: () => void;
}

export function RatingModal({
  isOpen,
  astrologerName,
  onSubmitRating,
  onSkip,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitRating(rating, comment);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-yellow-100 overflow-hidden text-[#1a1a1a]">
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white p-6 text-center relative">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 backdrop-blur">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold">Rate Your Consultation</h2>
          <p className="text-xs text-amber-100 mt-1">How was your session with {astrologerName}?</p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Star Selection */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        active ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {rating === 5 && '🌟 Excellent'}
              {rating === 4 && '👍 Very Good'}
              {rating === 3 && '👌 Good'}
              {rating === 2 && '😐 Average'}
              {rating === 1 && '👎 Poor'}
            </span>
          </div>

          {/* Comment Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>Feedback / Comments (Optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your consultation experience..."
              rows={3}
              className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none bg-gray-50/50"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={isSubmitting}
              className="flex-1 border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl"
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-xl shadow-md gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Rating</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
