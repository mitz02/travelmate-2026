import React, { useState } from 'react';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useCallContext } from '../../context/CallContext';
import { CallModal } from './CallModal';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, dismissCall, setCallId } = useCallContext();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [activeCall, setActiveCall] = useState<{ channel: string; otherName: string } | null>(null);

  if (!incomingCall) return null;

  if (activeCall) {
    return (
      <CallModal
        isOpen={true}
        onClose={() => {
          setActiveCall(null);
          dismissCall();
        }}
        channel={activeCall.channel}
        otherParticipantName={activeCall.otherName}
      />
    );
  }

  const callerName = `${incomingCall.first_name || ''} ${incomingCall.last_name || ''}`.trim() || 'Caller';

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.put(`/calls/${incomingCall.id}/accept`);
      setActiveCall({ channel: incomingCall.channel, otherName: callerName });
      setCallId(incomingCall.id);
    } catch {
      alert('Failed to accept call');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.put(`/calls/${incomingCall.id}/reject`);
    } catch {
      // ignore
    } finally {
      setRejecting(false);
      dismissCall();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center animate-fade-in-up">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4 animate-pulse-slow ring-4 ring-green-200">
          {callerName.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Incoming Call</h2>
        <p className="text-gray-500 mb-8">{callerName}</p>

        <div className="flex items-center gap-6">
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {rejecting ? <Loader2 size={24} className="animate-spin" /> : <PhoneOff size={28} />}
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {accepting ? <Loader2 size={24} className="animate-spin" /> : <Phone size={28} />}
          </button>
        </div>
      </div>
    </div>
  );
};
