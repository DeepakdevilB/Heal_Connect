'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioCallScreen, CallStatus } from '@/components/consultation/AudioCallScreen';
import { BillingSummaryModal } from '@/components/consultation/BillingSummaryModal';
import { RatingModal } from '@/components/consultation/RatingModal';
import { AgoraService } from '@/lib/agoraService';
import { getSocket, joinRoom, leaveRoom } from '@/lib/socketService';
import { consultationsApi, walletApi, tokenStore, ConsultationSession, BillingSummaryData } from '@/lib/api';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<ConsultationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Agora State
  const agoraRef = useRef<AgoraService | null>(null);
  const isConnectingRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('granted');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('good');
  const [callStatus, setCallStatus] = useState<CallStatus>('Connecting...');

  // Billing & Rating Modals State
  const [billingSummary, setBillingSummary] = useState<BillingSummaryData | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [insufficientWallet, setInsufficientWallet] = useState(false);

  // Initialize Socket.IO and listen for events
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    joinRoom({ consultationId: id });

    if (socket) {
      socket.on('consultation-accepted', (data: { session: ConsultationSession }) => {
        if (data.session) setSession(data.session);
      });

      socket.on('consultation-rejected', (data: { session: ConsultationSession }) => {
        if (data.session) {
          setSession(data.session);
          setCallStatus('Disconnected');
          setError('Consultation request was rejected by the astrologer.');
        }
      });

      socket.on('consultation-started', (data: { session: ConsultationSession }) => {
        if (data.session) setSession(data.session);
      });

      socket.on('consultation-ended', (data: { session: ConsultationSession; billingSummary?: BillingSummaryData }) => {
        if (data.session) setSession(data.session);
        if (data.billingSummary) setBillingSummary(data.billingSummary);
      });

      socket.on('billing-generated', (data: { billingSummary: BillingSummaryData }) => {
        if (data.billingSummary) {
          setBillingSummary(data.billingSummary);
          setShowBillingModal(true);
        }
      });
    }

    return () => {
      leaveRoom(`consultation_${id}`);
    };
  }, [id]);

  // Fetch initial consultation data
  const fetchSession = useCallback(async () => {
    const token = tokenStore.getAccess();
    if (!token || !id) {
      setError('Authentication token missing. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const res = await consultationsApi.get(token, id);
      if (res.success && res.data?.session) {
        setSession(res.data.session);
      } else {
        setError(res.message || 'Consultation session not found.');
      }
    } catch {
      setError('Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Check microphone permissions
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMicPermission('granted');
          stream.getTracks().forEach((t) => t.stop());
        })
        .catch(() => {
          setMicPermission('denied');
        });
    }
  }, []);

  // Handle Agora RTC Client lifecycle based on session status
  const startAgoraCall = useCallback(
    async (sessionId: string) => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      const token = tokenStore.getAccess();
      if (!token) {
        isConnectingRef.current = false;
        return;
      }

      try {
        if (agoraRef.current && agoraRef.current.getConnectionState() !== 'DISCONNECTED') {
          isConnectingRef.current = false;
          return;
        }
        setCallStatus('Connecting...');
        const joinRes = await consultationsApi.join(token, sessionId);

        if (!joinRes.success || !joinRes.data?.agora) {
          setError(joinRes.message || 'Failed to initialize Agora RTC channel.');
          isConnectingRef.current = false;
          return;
        }

        const { agora, session: updatedSession } = joinRes.data;
        setSession(updatedSession);

        if (!agoraRef.current) {
          agoraRef.current = new AgoraService();
        }

        await agoraRef.current.initClient({
          onUserJoined: () => {
            setCallStatus('Connected');
          },
          onUserLeft: (_user, reason) => {
            if (reason === 'quit') {
              setCallStatus('Disconnected');
            } else {
              setCallStatus('Waiting for Astrologer');
            }
          },
          onConnectionStateChange: (state) => {
            if (state === 'CONNECTED') setCallStatus('Connected');
            else if (state === 'RECONNECTING') setCallStatus('Reconnecting...');
            else if (state === 'DISCONNECTED') setCallStatus('Disconnected');
          },
          onNetworkQuality: (quality) => {
            if (quality.uplinkNetworkQuality <= 2 && quality.downlinkNetworkQuality <= 2) {
              setNetworkQuality('good');
            } else if (quality.uplinkNetworkQuality <= 4) {
              setNetworkQuality('fair');
            } else {
              setNetworkQuality('poor');
            }
          },
          onError: (err) => {
            setError(typeof err === 'string' ? err : err.message);
          },
        });

        await agoraRef.current.joinChannel(agora.appId, agora.channelName, agora.token, agora.uid);

        setCallStatus('Connected');
      } catch (err: unknown) {
        const errorMsg = err as Error;
        console.error('Agora call start error:', errorMsg);
        setError(errorMsg.message || 'Microphone error or Agora failure.');
      } finally {
        isConnectingRef.current = false;
      }
    },
    []
  );

  // State Machine Driver: Wallet check & Auto-join
  useEffect(() => {
    if (!session) return;

    if (session.status === 'PENDING_ACCEPTANCE') {
      setCallStatus('Waiting for Astrologer');
    } else if (session.status === 'ACCEPTED') {
      // Step 4: Verify Wallet
      const token = tokenStore.getAccess();
      if (token) {
        consultationsApi.checkWallet(token, session.id).then((res) => {
          if (!res.isSufficient) {
            setInsufficientWallet(true);
            setError('Insufficient wallet balance.');
          } else if (res.data?.session) {
            setSession(res.data.session);
          }
        });
      }
    } else if (session.status === 'WALLET_VERIFIED' || session.status === 'JOINING_CHANNEL') {
      startAgoraCall(session.id);
    } else if (session.status === 'ACTIVE') {
      setCallStatus('Connected');
    } else if (session.status === 'RATING_PENDING' || session.status === 'ENDED') {
      setCallStatus('Disconnected');
      if (!billingSummary) {
        // Fetch end status billing if missing
        const token = tokenStore.getAccess();
        if (token) {
          consultationsApi.end(token, session.id).then((res) => {
            if (res.data?.billingSummary) {
              setBillingSummary(res.data.billingSummary);
              setShowBillingModal(true);
            }
          });
        }
      } else {
        setShowBillingModal(true);
      }
    } else if (session.status === 'COMPLETED') {
      setCallStatus('Disconnected');
      router.push('/practitioners');
    }
  }, [session, startAgoraCall, billingSummary, router]);

  // Clean up Agora audio tracks on unmount
  useEffect(() => {
    return () => {
      if (agoraRef.current) {
        agoraRef.current.destroy();
        agoraRef.current = null;
      }
    };
  }, []);

  const handleEndCall = async () => {
    const token = tokenStore.getAccess();
    if (agoraRef.current) {
      await agoraRef.current.leaveChannel();
    }

    if (token && session) {
      try {
        const res = await consultationsApi.end(token, session.id);
        if (res.success && res.data) {
          setSession(res.data.session);
          setBillingSummary(res.data.billingSummary);
          setShowBillingModal(true);
        }
      } catch (err) {
        console.error('Error ending consultation:', err);
      }
    }
  };

  const handleSimulateAstrologer = async () => {
    const token = tokenStore.getAccess();
    if (!token || !session) return;
    try {
      const acceptRes = await consultationsApi.accept(token, session.id);
      if (acceptRes.success && acceptRes.data?.session) {
        const checkRes = await consultationsApi.checkWallet(token, session.id);
        if (checkRes.success && checkRes.data?.session) {
          const joinRes = await consultationsApi.join(token, session.id);
          if (joinRes.success && joinRes.data?.session) {
            setSession(joinRes.data.session);
          }
        }
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  const handleToggleMute = async () => {
    if (agoraRef.current) {
      const muted = await agoraRef.current.toggleMute();
      setIsMuted(muted);
      return muted;
    }
    setIsMuted(!isMuted);
    return !isMuted;
  };

  const handleRechargeWallet = async () => {
    const token = tokenStore.getAccess();
    if (token) {
      await walletApi.recharge(token, 500); // Recharge ₹500
      setInsufficientWallet(false);
      setError(null);
      fetchSession();
    }
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    const token = tokenStore.getAccess();
    if (token && session) {
      await consultationsApi.rating(token, { consultationId: session.id, rating, comment });
      setShowRatingModal(false);
      router.push('/practitioners');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-[#f59e0b] animate-spin" />
        <p className="text-sm font-medium text-gray-600">Connecting to session...</p>
      </div>
    );
  }

  if (insufficientWallet) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-yellow-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Insufficient Wallet Balance</h2>
          <p className="text-sm text-gray-500">
            Your wallet balance is lower than the required consultation rate. Please recharge your wallet to continue.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleRechargeWallet} className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold py-3 rounded-xl shadow">
              Quick Recharge ₹500
            </Button>
            <Link href="/practitioners">
              <Button variant="outline" className="w-full border-gray-200 text-gray-600 rounded-xl">
                Back to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/practitioners" className="flex items-center gap-2 text-gray-500 hover:text-[#f59e0b] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="font-extrabold text-[#f59e0b]">HealConnect Audio Session</span>
          </Link>
        </div>
      </header>

      {/* Main Call Container */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col justify-center items-center relative">
        {session?.status === 'PENDING_ACCEPTANCE' && (
          <div className="absolute top-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex flex-col items-center gap-2 shadow-md z-30 max-w-xs text-center">
            <span className="text-xs font-extrabold text-[#d97706] tracking-wider uppercase">✨ Dev Test Mode</span>
            <p className="text-xs text-gray-500 font-medium">Test the live call timer and billing summary modal without logging in as the astrologer.</p>
            <Button onClick={handleSimulateAstrologer} size="sm" className="bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold px-4 py-1.5 rounded-lg border-0 shadow">
              Simulate Astrologer Accept
            </Button>
          </div>
        )}
        <AudioCallScreen
          astrologerName={session?.practitioner?.name || 'Astrologer'}
          astrologerPhoto={session?.practitioner?.photoUrl}
          userName={session?.user?.name || 'User'}
          userPhoto={session?.user?.photoUrl}
          status={callStatus}
          isActive={session?.status === 'ACTIVE'}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          micPermission={micPermission}
          networkQuality={networkQuality}
          errorMessage={error}
        />
      </main>

      {/* Post-Call Billing Modal */}
      {billingSummary && (
        <BillingSummaryModal
          isOpen={showBillingModal}
          durationFormatted={billingSummary.durationFormatted}
          perMinuteRate={billingSummary.perMinuteRate}
          totalAmount={billingSummary.totalAmount}
          walletDeduction={billingSummary.walletDeduction}
          remainingWalletBalance={billingSummary.remainingWalletBalance}
          startTime={billingSummary.startTime}
          endTime={billingSummary.endTime}
          onProceedToRating={() => {
            setShowBillingModal(false);
            setShowRatingModal(true);
          }}
        />
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        astrologerName={session?.practitioner?.name || 'Astrologer'}
        onSubmitRating={handleSubmitRating}
        onSkip={() => {
          setShowRatingModal(false);
          router.push('/practitioners');
        }}
      />
    </div>
  );
}
