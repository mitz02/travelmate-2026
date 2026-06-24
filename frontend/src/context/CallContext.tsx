import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

interface IncomingCall {
  id: string;
  caller_id: string;
  callee_id: string;
  ride_id: string;
  channel: string;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface CallContextType {
  incomingCall: IncomingCall | null;
  dismissCall: () => void;
  callId: string | null;
  setCallId: (id: string | null) => void;
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  dismissCall: () => {},
  callId: null,
  setCallId: () => {},
});

export const useCallContext = () => useContext(CallContext);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callId, setCallIdState] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setCallId = useCallback((id: string | null) => {
    setCallIdState(id);
  }, []);

  const dismissCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/calls/incoming');
        const calls: IncomingCall[] = res.data.calls || [];
        if (calls.length > 0 && !incomingCall) {
          setIncomingCall(calls[0]);
        } else if (calls.length === 0) {
          setIncomingCall(null);
        }
      } catch {
        // silently ignore polling errors
      }
    };

    intervalRef.current = setInterval(poll, 5000);
    poll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [incomingCall]);

  return (
    <CallContext.Provider value={{ incomingCall, dismissCall, callId, setCallId }}>
      {children}
    </CallContext.Provider>
  );
};
