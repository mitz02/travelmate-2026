import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  body: string;
  bookingId: string;
}

export const BookingNotifications: React.FC = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((title: string, body: string, bookingId: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, body, bookingId }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const handleToastClick = (bookingId: string) => {
    navigate(`/notifications`);
  };

  useEffect(() => {
    if (!socket) return;

    const onBookingCreated = (data: any) => {
      addToast(
        'New Booking!',
        `${data.riderName || 'A rider'} booked ${data.seats || 1} seat(s) for ₦${Number(data.totalAmount || 0).toLocaleString()}`,
        data.bookingId
      );
    };

    const onBookingPaid = (data: any) => {
      addToast(
        'Booking Paid!',
        `${data.riderName || 'A rider'} paid for ${data.seats || 1} seat(s). Ready for confirmation.`,
        data.bookingId
      );
    };

    const onAdminNotification = (data: any) => {
      addToast(
        data.title || 'Notification',
        data.body || '',
        data.data?.bookingId || Date.now().toString()
      );
    };

    const onBookingAccepted = (data: any) => {
      addToast(
        'Booking Accepted!',
        'Your booking has been accepted by the driver.',
        data.bookingId
      );
    };

    const onBookingRejected = (data: any) => {
      addToast(
        'Booking Rejected',
        'Your booking was rejected. A refund has been issued.',
        data.bookingId
      );
    };

    socket.on('booking_created', onBookingCreated);
    socket.on('booking_paid', onBookingPaid);
    socket.on('admin_notification', onAdminNotification);
    socket.on('booking_accepted', onBookingAccepted);
    socket.on('booking_rejected', onBookingRejected);

    return () => {
      socket.off('booking_created', onBookingCreated);
      socket.off('booking_paid', onBookingPaid);
      socket.off('admin_notification', onAdminNotification);
      socket.off('booking_accepted', onBookingAccepted);
      socket.off('booking_rejected', onBookingRejected);
    };
  }, [socket, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '80px', right: '16px', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => { handleToastClick(t.bookingId); }}
          style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
            padding: '14px 16px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#FEF3C7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <Bell size={16} color="#D97706" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{t.title}</div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px', lineHeight: 1.3 }}>{t.body}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(x => x.id !== t.id)); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9CA3AF', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
