import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  ConnectionState,
  NetworkQuality,
} from 'agora-rtc-sdk-ng';

export interface AgoraCallbacks {
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser, reason: string) => void;
  onConnectionStateChange?: (curState: ConnectionState, revState: ConnectionState, reason?: string) => void;
  onNetworkQuality?: (quality: NetworkQuality) => void;
  onError?: (err: Error | string) => void;
}

export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private callbacks: AgoraCallbacks = {};
  private isMuted = false;
  private isJoined = false;

  async initClient(callbacks: AgoraCallbacks = {}): Promise<IAgoraRTCClient> {
    this.callbacks = callbacks;
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

    // Suppress console logs in production mode
    AgoraRTC.setLogLevel(3);

    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Event listeners
    this.client.on('user-published', async (user, mediaType) => {
      if (this.client) {
        await this.client.subscribe(user, mediaType);
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
        }
        if (this.callbacks.onUserJoined) {
          this.callbacks.onUserJoined(user);
        }
      }
    });

    this.client.on('user-unpublished', (user) => {
      if (this.callbacks.onUserLeft) {
        this.callbacks.onUserLeft(user, 'unpublished');
      }
    });

    this.client.on('user-left', (user, reason) => {
      if (this.callbacks.onUserLeft) {
        this.callbacks.onUserLeft(user, reason);
      }
    });

    this.client.on('connection-state-change', (curState, prevState, reason) => {
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(curState, prevState, reason);
      }
    });

    this.client.on('network-quality', (stats) => {
      if (this.callbacks.onNetworkQuality) {
        this.callbacks.onNetworkQuality(stats);
      }
    });

    return this.client;
  }

  async joinChannel(appId: string, channelName: string, token: string | null, uid: number): Promise<number | string> {
    if (!this.client) {
      await this.initClient(this.callbacks);
    }

    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

    try {
      // Create local microphone track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, // Acoustic Echo Cancellation
        ANS: true, // Automatic Noise Suppression
        AGC: true, // Automatic Gain Control
      });

      // Join channel
      const joinedUid = await this.client!.join(appId, channelName, token || null, uid);
      this.isJoined = true;

      // Publish local audio track
      if (this.localAudioTrack) {
        await this.client!.publish([this.localAudioTrack]);
      }

      return joinedUid;
    } catch (err: unknown) {
      const error = err as Error;
      if (this.callbacks.onError) {
        this.callbacks.onError(error.message || 'Failed to join Agora channel');
      }
      throw error;
    }
  }

  async toggleMute(): Promise<boolean> {
    if (this.localAudioTrack) {
      this.isMuted = !this.isMuted;
      await this.localAudioTrack.setMuted(this.isMuted);
      return this.isMuted;
    }
    return false;
  }

  setMute(mute: boolean) {
    if (this.localAudioTrack) {
      this.isMuted = mute;
      this.localAudioTrack.setMuted(mute);
    }
  }

  getConnectionState(): string {
    return this.client ? this.client.connectionState : 'DISCONNECTED';
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof window === 'undefined') return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audiooutput');
    } catch (err) {
      console.warn('Unable to enumerate audio output devices:', err);
      return [];
    }
  }

  async setAudioOutputDevice(deviceId: string) {
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setDevice(deviceId);
      } catch (err) {
        console.warn('Failed to set audio device:', err);
      }
    }
  }

  async leaveChannel() {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.client && this.isJoined) {
        await this.client.leave();
        this.isJoined = false;
      }
    } catch (err) {
      console.error('Error leaving Agora channel:', err);
    }
  }

  destroy() {
    this.leaveChannel();
    if (this.client) {
      this.client.removeAllListeners();
      this.client = null;
    }
  }
}
