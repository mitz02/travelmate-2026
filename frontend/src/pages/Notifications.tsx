import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Bell, Map, Wallet, ShieldAlert, CheckCheck, X, Calendar } from 'lucide-react';
import api from '../services/api';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  metadata?: any;
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'system' | 'payments' | 'booking'>('All');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/notifications');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/user/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/user/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'system') return n.type === 'system' || n.type === 'admin_alert';
    if (activeFilter === 'payments') return n.type === 'service_purchase';
    if (activeFilter === 'booking') return n.type === 'booking';
    return true;
  });

  const getIconData = (type: string) => {
    if (type === 'booking') return { icon: <Map size={20} />, bg: '#EEF2FF', color: '#4F46E5' };
    if (type === 'service_purchase') return { icon: <Wallet size={20} />, bg: '#ECFDF5', color: '#10B981' };
    return { icon: <ShieldAlert size={20} />, bg: '#FFFBEB', color: '#F59E0B' };
  };

  const handleViewNotification = (notif: AppNotification) => {
    setSelectedNotification(notif);
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={24} color="#4F46E5" />
              Notifications
            </h1>
            <p style={{ color: '#6B7280', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Stay updated with your latest alerts and messages.
            </p>
          </div>

          <button 
            onClick={markAllAsRead}
            disabled={!notifications.some(n => !n.is_read)}
            style={{
              background: '#EEF2FF', border: 'none', color: '#4F46E5', padding: '10px 16px',
              borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, cursor: notifications.some(n => !n.is_read) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px', opacity: notifications.some(n => !n.is_read) ? 1 : 0.6,
              transition: 'background-color 0.2s'
            }}
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {(['All', 'system', 'payments', 'booking'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: '50px',
                fontSize: '0.9rem', fontWeight: activeFilter === filter ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: activeFilter === filter ? '#4F46E5' : '#F3F4F6',
                color: activeFilter === filter ? '#ffffff' : '#4B5563',
                textTransform: 'capitalize', whiteSpace: 'nowrap'
              }}
            >
              {filter === 'system' ? 'System & Alerts' : filter === 'payments' ? 'Payments' : filter}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div style={{ 
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: '20px', 
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' 
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
              <Bell size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>No notifications found</p>
              <p style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>You're all caught up!</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const iconData = getIconData(notif.type);
              return (
                <div 
                  key={notif.id}
                  onClick={() => handleViewNotification(notif)}
                  style={{
                    display: 'flex', gap: '16px', padding: '20px 24px',
                    borderBottom: '1px solid #E5E7EB', cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: notif.is_read ? 'transparent' : '#F8FAFC'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : '#F8FAFC'}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: iconData.bg, color: iconData.color, flexShrink: 0
                  }}>
                    {iconData.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                      <h3 style={{ 
                        margin: 0, fontSize: '1.05rem', fontWeight: notif.is_read ? 600 : 700, 
                        color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                      }}>
                        {notif.title}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#6B7280', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {notif.body}
                    </p>
                  </div>

                  {!notif.is_read && (
                    <div style={{
                      width: '10px', height: '10px', backgroundColor: '#4F46E5',
                      borderRadius: '50%', alignSelf: 'center', flexShrink: 0
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setSelectedNotification(null)}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ 
              padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', 
              justifyContent: 'space-between', alignItems: 'flex-start' 
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: getIconData(selectedNotification.type).bg, 
                  color: getIconData(selectedNotification.type).color, flexShrink: 0
                }}>
                  {getIconData(selectedNotification.type).icon}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                    {selectedNotification.title}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNotification(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '32px 24px', fontSize: '1rem', color: '#374151', lineHeight: '1.6', flex: 1, overflowY: 'auto' }}>
              {selectedNotification.body}
              
              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Details</h4>
                  <pre style={{ margin: 0, fontSize: '0.85rem', color: '#111827', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
              <button 
                onClick={() => setSelectedNotification(null)}
                style={{
                  padding: '10px 24px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', 
                  borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
