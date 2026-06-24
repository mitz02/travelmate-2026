import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Map, User, Settings, LogOut, Menu, Bell, ShieldAlert, Zap, X, Wallet, CheckCheck, MessageSquare, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { FundWalletModal } from '../wallet/FundWalletModal';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

  const userNav: SidebarItem[] = [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/rider' },
    { icon: <Zap size={20} />, label: 'Airtime', path: '/airtime' },
    { icon: <Zap size={20} />, label: 'Data', path: '/data' },
    { icon: <Zap size={20} />, label: 'TV Subscriptions', path: '/tv-subscriptions' },
    { icon: <Zap size={20} />, label: 'Electricity', path: '/electricity' },
    { icon: <User size={20} />, label: 'Profile', path: '/profile' },
    { icon: <MessageSquare size={20} />, label: 'Messages', path: '/messages' },
    { icon: <Bell size={20} />, label: 'Notifications', path: '/notifications' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

const adminNav: SidebarItem[] = [
  { icon: <Home size={20} />, label: 'Overview', path: '/admin' },
  { icon: <User size={20} />, label: 'Users', path: '/admin/users' },
  { icon: <ShieldAlert size={20} />, label: 'KYC Approvals', path: '/admin/kyc' },
  { icon: <BookOpen size={20} />, label: 'Bookings', path: '/admin/bookings' },
  { icon: <CheckCheck size={20} />, label: 'Completions', path: '/admin/completions' },
  { icon: <Map size={20} />, label: 'All Rides', path: '/admin/rides' },
  { icon: <Zap size={20} />, label: 'Data Plans', path: '/admin/data-plans' },
  { icon: <Zap size={20} />, label: 'Airtime', path: '/admin/airtime' },
  { icon: <Zap size={20} />, label: 'Electricity', path: '/admin/electricity' },
  { icon: <Zap size={20} />, label: 'TV Subs', path: '/admin/tv-subscriptions' },
  { icon: <Bell size={20} />, label: 'System Messages', path: '/admin/broadcast' },
  { icon: <User size={20} />, label: 'Profile', path: '/profile' },
  { icon: <Settings size={20} />, label: 'System', path: '/admin/settings' },
];

const driverNav: SidebarItem[] = [
  { icon: <Home size={20} />, label: 'Dashboard', path: '/driver' },
  { icon: <Map size={20} />, label: 'My Routes', path: '/driver/routes' },
  { icon: <Zap size={20} />, label: 'Airtime', path: '/airtime' },
  { icon: <Zap size={20} />, label: 'Data', path: '/data' },
  { icon: <Zap size={20} />, label: 'TV Subscriptions', path: '/tv-subscriptions' },
  { icon: <Zap size={20} />, label: 'Electricity', path: '/electricity' },
  { icon: <User size={20} />, label: 'Profile', path: '/profile' },
  { icon: <MessageSquare size={20} />, label: 'Messages', path: '/messages' },
  { icon: <Bell size={20} />, label: 'Notifications', path: '/notifications' },
  { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
];

const layoutStyles = `
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.dashboard-scroll::-webkit-scrollbar {
  width: 6px;
}
.dashboard-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.dashboard-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}
`;

export const DashboardLayout: React.FC<{ children: React.ReactNode; isAdmin?: boolean; noPadding?: boolean }> = ({ 
  children, 
  isAdmin = false,
  noPadding = false
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [balance, setBalance] = useState<number | null>(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'system' | 'payments' | 'Booking'>('All');

  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/me');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    const addNotification = (data: any, type: string, title: string, body: string) => {
      const newNotif = {
        id: `socket_${Date.now()}_${Math.random()}`,
        title,
        body,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
        data,
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    const onBookingCreated = (data: any) => {
      addNotification(
        data,
        'booking',
        'New Booking',
        `${data.riderName || 'A rider'} booked ${data.seats || 1} seat(s) for ₦${Number(data.totalAmount || 0).toLocaleString()}`
      );
    };

    const onBookingPaid = (data: any) => {
      addNotification(
        data,
        'booking',
        'Booking Paid',
        `${data.riderName || 'A rider'} paid for ${data.seats || 1} seat(s).`
      );
    };

    const onAdminNotification = (data: any) => {
      addNotification(
        data,
        'admin_alert',
        data.title || 'Notification',
        data.body || ''
      );
    };

    const onBookingAccepted = (data: any) => {
      addNotification(
        data,
        'booking',
        'Booking Accepted',
        `Your booking for ${data.seats || 1} seat(s) was accepted.`
      );
    };

    const onBookingRejected = (data: any) => {
      addNotification(
        data,
        'booking',
        'Booking Rejected',
        `Your booking for ${data.seats || 1} seat(s) was rejected.`
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
  }, [socket, user]);

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'system') return n.type === 'system' || n.type === 'admin_alert';
    if (activeFilter === 'payments') return n.type === 'service_purchase';
    if (activeFilter === 'Booking') return n.type === 'booking';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    if (user?.role === 'rider' || user?.role === 'driver') {
      api.get('/wallet/me').then(res => {
        setBalance(res.data.balance);
      }).catch(err => console.error('Failed to fetch balance', err));
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [user]);
  
  let navItems = userNav;
  let dashboardTitle = 'Rider Dashboard';
  if (user?.role === 'admin' || isAdmin) {
    navItems = adminNav;
    dashboardTitle = 'Admin Portal';
  } else if (user?.role === 'driver') {
    navItems = driverNav;
    dashboardTitle = 'Driver Dashboard';
  }
  
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'TM';

  const colors = {
    bg: 'var(--bg-color)',
    sidebar: 'var(--bg-sidebar)',
    card: 'var(--bg-card)',
    cardHover: 'var(--card-hover)',
    border: 'var(--border-color)',
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    text: 'var(--text-main)',
    textMuted: 'var(--text-muted)'
  };

  return (
    <>
      <style>{layoutStyles}</style>
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw',
        backgroundColor: colors.bg, 
        color: colors.text, 
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden' 
      }}>
        
        {/* Mobile Overlay */}
        {!isDesktop && isSidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.8)',
              backdropFilter: 'blur(4px)', zIndex: 40
            }}
          />
        )}

        {/* Sidebar */}
        <aside style={{
          position: isDesktop ? 'static' : 'fixed',
          top: 0, left: 0, height: '100%',
          width: '280px',
          backgroundColor: colors.sidebar, // light mode sidebar
          borderRight: `1px solid ${colors.border}`,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDesktop ? 'none' : '4px 0 24px rgba(0,0,0,0.1)'
        }}>
          {/* Logo Area */}
          <div style={{
            height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', borderBottom: `1px solid \${colors.border}`
          }}>
            <span style={{ 
              fontSize: '1.5rem', fontWeight: 700, 
              background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
              WebkitBackgroundClip: 'text', color: 'transparent'
            }}>
              TravelMate
            </span>
            {!isDesktop && (
              <button onClick={() => setSidebarOpen(false)} style={{
                background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer'
              }}>
                <X size={24} />
              </button>
            )}
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }} className="dashboard-scroll">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); if (!isDesktop) setSidebarOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                    padding: '12px 16px', borderRadius: '12px',
                    border: 'none', cursor: 'pointer',
                    backgroundColor: isActive ? colors.primaryLight : 'transparent',
                    color: isActive ? colors.primary : colors.textMuted,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = colors.cardHover; e.currentTarget.style.color = colors.text; }}
                  onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.textMuted; }}
                >
                  <span style={{ marginRight: '16px', display: 'flex' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div style={{ padding: '24px 16px', borderTop: `1px solid \${colors.border}` }}>
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                padding: '12px 16px', borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)',
                color: '#EF4444', cursor: 'pointer', transition: 'all 0.2s ease',
                fontSize: '0.95rem', fontWeight: 500
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
            >
              <LogOut size={18} style={{ marginRight: '12px' }} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          
          {/* Header */}
          <header style={{
            height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', backgroundColor: 'color-mix(in srgb, var(--bg-card) 90%, transparent)',
            backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.border}`, zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {!isDesktop && (
                <button onClick={() => setSidebarOpen(true)} style={{
                  background: 'transparent', border: 'none', color: colors.text, cursor: 'pointer', marginRight: '16px'
                }}>
                  <Menu size={24} />
                </button>
              )}
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{dashboardTitle}</h1>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                  style={{
                    position: 'relative', background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer',
                    padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryLight}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Bell size={22} style={{ color: isNotificationsOpen ? colors.primary : colors.textMuted }} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6, minWidth: '16px', height: '16px',
                      backgroundColor: '#EF4444', borderRadius: '50%', color: '#fff', fontSize: '10px',
                      fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: '2px solid #fff'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <>
                    <div 
                      onClick={() => setNotificationsOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    />
                    
                    <div style={{
                      position: 'absolute', right: 0, marginTop: '8px', width: '380px',
                      maxHeight: '480px', backgroundColor: 'var(--bg-card)', borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      border: `1px solid ${colors.border}`, zIndex: 100, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden', animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{
                        padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: colors.text }}>Notifications</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            style={{
                              background: 'transparent', border: 'none', color: colors.primary,
                              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: '4px'
                            }}
                          >
                            <CheckCheck size={14} />
                            Mark all as read
                          </button>
                        )}
                      </div>

                      <div style={{
                        display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: 'var(--card-hover)'
                      }}>
                        {(['All', 'system', 'payments', 'Booking'] as const).map(filter => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            style={{
                              flex: 1, padding: '6px 0', border: 'none', borderRadius: '8px',
                              fontSize: '0.78rem', fontWeight: activeFilter === filter ? 600 : 500,
                              cursor: 'pointer', transition: 'all 0.2s',
                              backgroundColor: activeFilter === filter ? colors.primary : 'transparent',
                              color: activeFilter === filter ? '#ffffff' : colors.textMuted,
                              textTransform: 'capitalize'
                            }}
                          >
                            {filter === 'system' ? 'System' : filter === 'payments' ? 'Payments' : filter}
                          </button>
                        ))}
                      </div>

                      <div className="dashboard-scroll" style={{ flex: 1, overflowY: 'auto', maxHeight: '340px' }}>
                        {filteredNotifications.length === 0 ? (
                          <div style={{
                            padding: '40px 20px', textAlign: 'center', color: colors.textMuted,
                            fontSize: '0.9rem'
                          }}>
                            No notifications found
                          </div>
                        ) : (
                          filteredNotifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                if (!notif.is_read) markAsRead(notif.id);
                              }}
                              style={{
                                display: 'flex', gap: '12px', padding: '14px 20px',
                                borderBottom: `1px solid ${colors.border}`, cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                backgroundColor: notif.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.03)'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.03)'}
                            >
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                backgroundColor: 
                                  notif.type === 'booking' ? '#EEF2FF' :
                                  notif.type === 'service_purchase' ? '#ECFDF5' : '#FFFBEB',
                                color: 
                                  notif.type === 'booking' ? '#4F46E5' :
                                  notif.type === 'service_purchase' ? '#10B981' : '#F59E0B'
                              }}>
                                {notif.type === 'booking' ? <Map size={18} /> :
                                 notif.type === 'service_purchase' ? <Wallet size={18} /> :
                                 <ShieldAlert size={18} />}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                  gap: '8px', marginBottom: '2px'
                                }}>
                                  <p style={{
                                    margin: 0, fontSize: '0.88rem', fontWeight: notif.is_read ? 600 : 700,
                                    color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {notif.title}
                                  </p>
                                  <span style={{ fontSize: '0.72rem', color: colors.textMuted, flexShrink: 0 }}>
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p style={{
                                  margin: 0, fontSize: '0.8rem', color: colors.textMuted,
                                  lineHeight: '1.4', wordBreak: 'break-word'
                                }}>
                                  {notif.body}
                                </p>
                              </div>

                              {!notif.is_read && (
                                <div style={{
                                  width: '8px', height: '8px', backgroundColor: colors.primary,
                                  borderRadius: '50%', alignSelf: 'center', flexShrink: 0
                                }} />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: colors.primaryLight, borderRadius: '20px', color: colors.primary }}>
                <Wallet size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {balance !== null ? `₦${balance.toLocaleString()}` : '₦0'}
                </span>
                <button 
                  onClick={() => setIsFundModalOpen(true)}
                  className="ml-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm"
                  title="Fund Wallet"
                >
                  +
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '24px', borderLeft: `1px solid ${colors.border}` }}>
                <div style={{ textAlign: 'right', display: isDesktop ? 'block' : 'none' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1 }}>{user?.firstName} {user?.lastName}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: colors.textMuted, textTransform: 'capitalize' }}>{user?.role}</p>
                </div>
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={`${user.firstName} ${user.lastName}`}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      objectFit: 'cover', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                      border: '2px solid rgba(79, 70, 229, 0.3)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}>
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="dashboard-scroll" style={{ 
            flex: 1, overflowY: 'auto', padding: noPadding ? 0 : '32px 24px',
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
      <FundWalletModal 
        isOpen={isFundModalOpen} 
        onClose={() => setIsFundModalOpen(false)} 
        onSuccess={(newBalance) => setBalance(newBalance)} 
      />
    </>
  );
};
