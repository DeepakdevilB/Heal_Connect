'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAvatarUrl } from '@/lib/utils';

export type CallStatus =
  | 'Connecting...'
  | 'Connected'
  | 'Reconnecting...'
  | 'Disconnected'
  | 'Waiting for Astrologer'
  | 'Waiting for User';

export interface AudioCallScreenProps {
  astrologerName: string;
  astrologerPhoto?: string | null;
  userName: string;
  userPhoto?: string | null;
  status: CallStatus;
  isActive: boolean;
  onEndCall: () => void;
  onToggleMute: () => Promise<boolean>;
  onToggleSpeaker?: () => void;
  isMuted: boolean;
  micPermission: 'granted' | 'denied' | 'prompt';
  networkQuality: 'good' | 'fair' | 'poor' | 'unknown';
  errorMessage?: string | null;
}

export function AudioCallScreen({
  astrologerName,
  astrologerPhoto,
  userName,
  userPhoto,
  status,
  isActive,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  isMuted,
  micPermission,
  networkQuality,
  errorMessage,
}: AudioCallScreenProps) {
  const [seconds, setSeconds] = useState(0);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  // Live Timer: runs ONLY when call is ACTIVE
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeColor = (st: CallStatus) => {
    switch (st) {
      case 'Connected':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20 shadow-lg';
      case 'Connecting...':
      case 'Waiting for Astrologer':
      case 'Waiting for User':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'Reconnecting...':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 animate-pulse';
      case 'Disconnected':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getNetworkIcon = () => {
    switch (networkQuality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-emerald-400" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-amber-400" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'unknown':
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleSpeakerClick = () => {
    setSpeakerEnabled(!speakerEnabled);
    if (onToggleSpeaker) onToggleSpeaker();
  };

  const userAvatar = getAvatarUrl(userName, userPhoto);
  const astrologerAvatar = getAvatarUrl(astrologerName, astrologerPhoto);

  return (
    <div className="relative min-h-[620px] w-full max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white p-6 md:p-8 flex flex-col justify-between shadow-2xl border border-slate-700/60 overflow-hidden font-sans animate-in fade-in duration-500">
      {/* Background Decorative Pulsing Ripples */}
      {status === 'Connecting...' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-72 h-72 rounded-full border border-amber-400 animate-ping" />
          <div className="w-96 h-96 rounded-full border border-amber-500/50 animate-pulse absolute" />
        </div>
      )}

      {/* Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`px-3.5 py-1 text-xs font-bold rounded-full border ${getStatusBadgeColor(status)}`}>
            {status}
          </Badge>
          {micPermission === 'denied' && (
            <Badge variant="outline" className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Mic Blocked
            </Badge>
          )}
        </div>

        {/* Network & Security Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-700/80 shadow-inner">
            {getNetworkIcon()}
            <span className="capitalize font-medium">{networkQuality}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-medium text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Encrypted
          </div>
        </div>
      </div>

      {/* Main Call Center Body */}
      <div className="relative z-10 my-6 flex flex-col items-center justify-center gap-6">
        {/* Avatars Display */}
        <div className="flex items-center justify-center gap-8 md:gap-12 w-full">
          {/* User Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <img
                src={userAvatar}
                alt={userName}
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-cover border-2 border-slate-600 shadow-xl transition-transform hover:scale-105"
              />
              <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-1.5 border border-slate-600 shadow">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-300">{userName}</span>
            <span className="text-[10px] text-slate-400 font-medium">You</span>
          </div>

          {/* Connection Pulse Audio Wave Animation */}
          <div className="flex items-center justify-center gap-1.5 opacity-90">
            <span className={`w-1.5 h-6 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
            <span className={`w-1.5 h-10 rounded-full ${isActive ? 'bg-emerald-400 animate-bounce' : 'bg-amber-400 animate-ping'}`} />
            <span className={`w-1.5 h-12 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-bounce'}`} />
            <span className={`w-1.5 h-8 rounded-full ${isActive ? 'bg-emerald-400 animate-bounce' : 'bg-amber-400 animate-pulse'}`} />
            <span className={`w-1.5 h-5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
          </div>

          {/* Astrologer Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl bg-amber-500/20 blur-md animate-pulse" />
              <img
                src={astrologerAvatar}
                alt={astrologerName}
                className="w-24 h-24 md:w-28 md:h-28 rounded-3xl object-cover border-4 border-amber-400 shadow-2xl relative z-10 transition-transform hover:scale-105"
              />
            </div>
            <span className="text-sm font-extrabold text-amber-300 flex items-center gap-1">
              {astrologerName} <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Astrologer
            </span>
          </div>
        </div>

        {/* Live Timer Display */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-500/40 px-6 py-2.5 rounded-full text-2xl md:text-3xl font-mono font-extrabold text-amber-400 tracking-wider shadow-inner">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            {formatTimer(seconds)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {isActive ? 'Live Consultation in Progress' : 'Timer starts automatically once connected'}
          </p>
        </div>

        {/* Error / Alert Banners */}
        {errorMessage && (
          <div className="w-full bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Control Buttons Footer */}
      <div className="relative z-10 bg-slate-800/70 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 flex items-center justify-around shadow-xl">
        {/* Mute / Unmute Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-2xl border transition-all duration-200 ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {/* End Consultation Call Button */}
        <Button
          variant="destructive"
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-rose-400/30"
          title="End Consultation"
        >
          <PhoneOff className="w-7 h-7" />
        </Button>

        {/* Speaker Output Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSpeakerClick}
          className={`w-14 h-14 rounded-2xl border transition-all duration-200 ${
            speakerEnabled
              ? 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
          }`}
          title={speakerEnabled ? 'Mute Speaker' : 'Enable Speaker'}
        >
          {speakerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  );
}
