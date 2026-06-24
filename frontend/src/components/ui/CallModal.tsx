import React, { useState, useEffect } from 'react';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useLocalMicrophoneTrack, 
  useJoin, 
  usePublish, 
  useRemoteUsers, 
  useRemoteAudioTracks 
} from 'agora-rtc-react';
import { PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useCallContext } from '../../context/CallContext';

// Initialize the Agora client outside the component to avoid re-creation
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: string;
  otherParticipantName: string;
}

const CallContent: React.FC<CallModalProps> = ({ isOpen, onClose, channel, otherParticipantName }) => {
  const [tokenInfo, setTokenInfo] = useState<{ token: string; appId: string; uid: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch token when modal opens
  useEffect(() => {
    if (!isOpen) {
      setTokenInfo(null);
      setError(null);
      return;
    }

    let mounted = true;
    const fetchToken = async () => {
      try {
        const uid = Math.floor(Math.random() * 2147483647) + 1;
        const res = await api.get(`/agora/token?channel=${channel}&uid=${uid}`);
        if (mounted) {
          setTokenInfo({
            token: res.data.token,
            appId: res.data.appId,
            uid: res.data.uid, 
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to connect to call');
      }
    };

    fetchToken();
    return () => { mounted = false; };
  }, [isOpen, channel]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <PhoneOff size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Failed</h2>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white rounded-full font-bold">
          Close
        </button>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Connecting to {otherParticipantName}...</h2>
      </div>
    );
  }

  return (
    <ActiveCall 
      appId={tokenInfo.appId} 
      channel={channel} 
      token={tokenInfo.token} 
      uid={tokenInfo.uid} 
      otherParticipantName={otherParticipantName}
      onEndCall={onClose}
    />
  );
};

const ActiveCall: React.FC<{
  appId: string;
  channel: string;
  token: string;
  uid: number;
  otherParticipantName: string;
  onEndCall: () => void;
}> = ({ appId, channel, token, uid, otherParticipantName, onEndCall }) => {
  const { callId, setCallId } = useCallContext();
  const [isMuted, setIsMuted] = useState(false);
  
  // Join the channel
  useJoin({ appid: appId, channel: channel, token: token, uid: uid }, true);

  // Set up local microphone track
  const { localMicrophoneTrack, isLoading: isMicLoading, error: micError } = useLocalMicrophoneTrack();
  
  // Publish local track
  usePublish([localMicrophoneTrack]);

  // Subscribe to remote users and play their audio
  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);
  
  // Play remote audio tracks automatically
  audioTracks.forEach(track => track.play());

  const toggleMute = () => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleEndCall = async () => {
    if (callId) {
      try { await api.put(`/calls/${callId}/end`); } catch {}
      setCallId(null);
    }
    onEndCall();
  };

  return (
    <div className="flex flex-col items-center p-8 w-full max-w-sm bg-white rounded-3xl shadow-2xl animate-fade-in-up">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-6 ring-4 ring-primary/20 animate-pulse-slow">
        {otherParticipantName.charAt(0).toUpperCase()}
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-1">{otherParticipantName}</h2>
      
      <div className="text-sm font-medium text-emerald-500 mb-10 flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        Call in progress
        {remoteUsers.length === 0 && <span className="text-gray-400 ml-1">(Ringing...)</span>}
      </div>

      {micError && (
        <p className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded">Microphone access denied.</p>
      )}

      <div className="flex items-center gap-6">
        <button 
          onClick={toggleMute}
          disabled={isMicLoading}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${isMuted ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 text-white transition-transform hover:scale-105 active:scale-95"
        >
          <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
}

export const CallModal: React.FC<CallModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={props.onClose}
      />
      <div className="relative z-10 w-full max-w-sm">
        <AgoraRTCProvider client={client}>
          <CallContent {...props} />
        </AgoraRTCProvider>
      </div>
    </div>
  );
};
