import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface ChatNotification {
  conversationId: string;
  senderName: string;
  content: string;
}

export const ChatNotifications: React.FC = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState<ChatNotification | null>(null);

  const dismiss = useCallback(() => setNotification(null), []);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: ChatNotification) => {
      // Don't show notification if already on the messages page
      if (location.pathname === '/messages') return;
      setNotification(data);
    };

    socket.on('chat_notification', handler);
    return () => { socket.off('chat_notification', handler); };
  }, [socket, location.pathname]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [notification, dismiss]);

  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-slide-up">
      <div
        onClick={() => {
          navigate(`/messages?select=${notification.conversationId}`);
          dismiss();
        }}
        className="flex items-start gap-3 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
      >
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 mb-0.5">
            {notification.senderName}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {notification.content}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
