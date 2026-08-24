import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, User, Settings, LogOut, Menu, Bell, ShieldAlert, ShieldCheck, Zap, X, Wallet,
  CheckCheck, CheckCircle2, MessageSquare, BookOpen, BarChart3, Users, Ticket, Car, Wifi, Smartphone, Tv,
  Megaphone, UserCircle, Sliders, Route, CreditCard, ScrollText
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
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/rider' },
  { icon: <Wallet size={20} />, label: 'Wallet', path: '/wallet' },
  { icon: <Smartphone size={20} />, label: 'Airtime', path: '/airtime' },
  { icon: <Wifi size={20} />, label: 'Data', path: '/data' },
  { icon: <Tv size={20} />, label: 'TV Subscriptions', path: '/tv-subscriptions' },
  { icon: <Zap size={20} />, label: 'Electricity', path: '/electricity' },
  { icon: <UserCircle size={20} />, label: 'Profile', path: '/profile' },
  { icon: <MessageSquare size={20} />, label: 'Messages', path: '/messages' },
  { icon: <Bell size={20} />, label: 'Notifications', path: '/notifications' },
  { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
];

const adminNav: SidebarItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/admin' },
  { icon: <Users size={20} />, label: 'Users', path: '/admin/users' },
  { icon: <ShieldCheck size={20} />, label: 'KYC Approvals', path: '/admin/kyc' },
  { icon: <Ticket size={20} />, label: 'Bookings', path: '/admin/bookings' },
  { icon: <CreditCard size={20} />, label: 'Transactions', path: '/admin/transactions' },
  { icon: <CheckCircle2 size={20} />, label: 'Completions', path: '/admin/completions' },
  { icon: <Car size={20} />, label: 'All Rides', path: '/admin/rides' },
  { icon: <Wifi size={20} />, label: 'Data Plans', path: '/admin/data-plans' },
  { icon: <Smartphone size={20} />, label: 'Airtime', path: '/admin/airtime' },
  { icon: <Zap size={20} />, label: 'Electricity', path: '/admin/electricity' },
  { icon: <Tv size={20} />, label: 'TV Subs', path: '/admin/tv-subscriptions' },
  { icon: <Megaphone size={20} />, label: 'System Messages', path: '/admin/broadcast' },
  { icon: <ScrollText size={20} />, label: 'Audit Logs', path: '/admin/audit-logs' },
  { icon: <UserCircle size={20} />, label: 'Profile', path: '/profile' },
  { icon: <Sliders size={20} />, label: 'System', path: '/admin/settings' },
];

const driverNav: SidebarItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/driver' },
  { icon: <Route size={20} />, label: 'My Routes', path: '/driver/routes' },
  { icon: <Wallet size={20} />, label: 'Wallet', path: '/wallet' },
  { icon: <Smartphone size={20} />, label: 'Airtime', path: '/airtime' },
  { icon: <Wifi size={20} />, label: 'Data', path: '/data' },
  { icon: <Tv size={20} />, label: 'TV Subscriptions', path: '/tv-subscriptions' },
  { icon: <Zap size={20} />, label: 'Electricity', path: '/electricity' },
  { icon: <UserCircle size={20} />, label: 'Profile', path: '/profile' },
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
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes borderGlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes sidebarPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

/* Sidebar nav item hover glow */
.tm-nav-item {
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.tm-nav-item:hover {
  background: rgba(255,255,255,0.08) !important;
  transform: translateX(4px);
}
.tm-nav-item.active {
  background: linear-gradient(135deg, rgba(0,82,212,0.85) 0%, rgba(0,201,255,0.75) 100%) !important;
  box-shadow: 0 4px 18px rgba(0,82,212,0.45), inset 0 1px 0 rgba(255,255,255,0.15);
}
.tm-nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 60%;
  background: #00E676;
  border-radius: 0 4px 4px 0;
}

/* Scrollbar for sidebar */
.dashboard-scroll::-webkit-scrollbar { width: 4px; }
.dashboard-scroll::-webkit-scrollbar-track { background: transparent; }
.dashboard-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
.dashboard-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,230,118,0.3); }

/* Header wallet badge */
.tm-wallet-badge {
  background: linear-gradient(135deg, rgba(0,82,212,0.1), rgba(0,230,118,0.08));
  border: 1px solid rgba(0,82,212,0.2);
  transition: all 0.2s ease;
}
.tm-wallet-badge:hover {
  background: linear-gradient(135deg, rgba(0,82,212,0.18), rgba(0,230,118,0.14));
  border-color: rgba(0,82,212,0.35);
}

/* Content fadeIn */
.tm-content-area { animation: fadeIn 0.45s cubic-bezier(0.16,1,0.3,1); }

/* Notification dot pulse */
@keyframes notifPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
}
.tm-notif-badge { animation: notifPulse 2s ease infinite; }
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
  const { user, logout, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

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

  return (
    <>
      <style>{layoutStyles}</style>
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw',
        backgroundColor: '#F3F4F6', 
        color: '#0B192C', 
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        overflow: 'hidden' 
      }}>
        
        {/* Mobile Overlay */}
        {!isDesktop && isSidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(11,25,44,0.75)',
              backdropFilter: 'blur(6px)', zIndex: 40
            }}
          />
        )}

        {/* ── Sidebar ── */}
        <aside style={{
          position: isDesktop ? 'static' : 'fixed',
          top: 0, left: 0, height: '100%',
          width: '268px',
          background: 'linear-gradient(180deg, #0B192C 0%, #0F223D 55%, #0A1828 100%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDesktop ? '4px 0 32px rgba(0,0,0,0.25)' : '6px 0 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {/* Sidebar background accent blobs */}
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 200, height: 200,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,82,212,0.25) 0%, transparent 70%)',
            pointerEvents: 'none', animation: 'sidebarPulse 5s ease infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: 80, left: -40, width: 160, height: 160,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,230,118,0.12) 0%, transparent 70%)',
            pointerEvents: 'none', animation: 'sidebarPulse 7s ease infinite 2s',
          }} />

          {/* Logo Area */}
          <div style={{
            height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px 0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <img
                src="/logo2.png"
                alt="TravelMate"
                style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
            {!isDesktop && (
              <button onClick={() => setSidebarOpen(false)} style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Role badge */}
          <div style={{ padding: '14px 16px 6px', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: '20px',
              background: 'rgba(0,230,118,0.12)',
              border: '1px solid rgba(0,230,118,0.22)',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#00E676', boxShadow: '0 0 6px #00E676',
              }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00E676', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {isAdmin ? 'Admin Portal' : user?.role === 'driver' ? 'Driver Mode' : 'Rider Mode'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }} className="dashboard-scroll">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  className={`tm-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => { navigate(item.path); if (!isDesktop) setSidebarOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                    padding: '11px 14px', borderRadius: '12px',
                    border: 'none', cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    marginRight: '13px', display: 'flex', flexShrink: 0,
                    color: isActive ? '#00E676' : 'rgba(255,255,255,0.4)',
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: isActive ? 700 : 500, letterSpacing: isActive ? '0.01em' : 'normal' }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div style={{ padding: '12px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                padding: '11px 16px', borderRadius: '12px',
                border: '1px solid rgba(239,68,68,0.25)', 
                backgroundColor: 'rgba(239,68,68,0.07)',
                color: '#FC8080', cursor: 'pointer', transition: 'all 0.2s ease',
                fontSize: '0.88rem', fontWeight: 600,
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = '#FC8080'; }}
            >
              <LogOut size={16} style={{ marginRight: '10px' }} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          
          {/* ── Header ── */}
          <header style={{
            height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(229,231,235,0.8)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            zIndex: 10,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {!isDesktop && (
                <button onClick={() => setSidebarOpen(true)} style={{
                  background: 'none', border: 'none', color: '#0B192C', cursor: 'pointer',
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px', transition: 'background 0.2s',
                }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Menu size={22} />
                </button>
              )}
              {/* Page title with gradient accent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 4, height: 28, borderRadius: '4px',
                  background: 'linear-gradient(180deg, #0052D4 0%, #00E676 100%)',
                  flexShrink: 0,
                }} />
                <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0B192C', letterSpacing: '-0.01em' }}>
                  {dashboardTitle}
                </h1>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setNotificationsOpen(!isNotificationsOpen)}
                  style={{
                    position: 'relative', background: isNotificationsOpen ? '#EEF5FF' : 'transparent',
                    border: '1px solid', borderColor: isNotificationsOpen ? '#0052D4' : 'transparent',
                    color: isNotificationsOpen ? '#0052D4' : '#6B7280', cursor: 'pointer',
                    width: 38, height: 38, borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { if (!isNotificationsOpen) { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#E5E7EB'; }}}
                  onMouseOut={(e) => { if (!isNotificationsOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="tm-notif-badge" style={{
                      position: 'absolute', top: 5, right: 5, minWidth: '15px', height: '15px',
                      backgroundColor: '#EF4444', borderRadius: '50%', color: '#fff', fontSize: '9px',
                      fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px', border: '2px solid #fff',
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
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '380px',
                      maxHeight: '480px', backgroundColor: '#fff', borderRadius: '20px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,82,212,0.08)',
                      border: '1px solid rgba(229,231,235,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden', animation: 'fadeIn 0.2s ease',
                    }}>
                      {/* Notification header */}
                      <div style={{
                        padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'linear-gradient(135deg, #F8FAFF 0%, #FAFFF8 100%)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Bell size={16} style={{ color: '#0052D4' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0B192C' }}>Notifications</span>
                          {unreadCount > 0 && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '20px',
                              background: 'rgba(0,82,212,0.1)', color: '#0052D4',
                              fontSize: '0.72rem', fontWeight: 700,
                            }}>{unreadCount} new</span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            style={{
                              background: 'transparent', border: 'none', color: '#0052D4',
                              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: '4px',
                            }}
                          >
                            <CheckCheck size={13} />
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Filter tabs */}
                      <div style={{
                        display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid #F3F4F6',
                        backgroundColor: '#FAFAFA',
                      }}>
                        {(['All', 'system', 'payments', 'Booking'] as const).map(filter => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            style={{
                              flex: 1, padding: '6px 0', border: 'none', borderRadius: '8px',
                              fontSize: '0.75rem', fontWeight: activeFilter === filter ? 700 : 500,
                              cursor: 'pointer', transition: 'all 0.2s',
                              backgroundColor: activeFilter === filter ? '#0052D4' : 'transparent',
                              color: activeFilter === filter ? '#fff' : '#6B7280',
                              textTransform: 'capitalize',
                            }}
                          >
                            {filter === 'system' ? 'System' : filter === 'payments' ? 'Payments' : filter}
                          </button>
                        ))}
                      </div>

                      <div className="dashboard-scroll" style={{ flex: 1, overflowY: 'auto', maxHeight: '340px' }}>
                        {filteredNotifications.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>
                            <Bell size={32} style={{ color: '#D1D5DB', marginBottom: 10 }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>No notifications</p>
                          </div>
                        ) : (
                          filteredNotifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                              style={{
                                display: 'flex', gap: '12px', padding: '14px 20px',
                                borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                                transition: 'background-color 0.15s',
                                backgroundColor: notif.is_read ? 'transparent' : 'rgba(0,82,212,0.03)',
                              }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(0,82,212,0.03)'}
                            >
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                backgroundColor: 
                                  notif.type === 'booking' ? '#EEF5FF' :
                                  notif.type === 'service_purchase' ? '#F0FFF4' : '#FFFBEB',
                                color: 
                                  notif.type === 'booking' ? '#0052D4' :
                                  notif.type === 'service_purchase' ? '#00C853' : '#F59E0B',
                              }}>
                                {notif.type === 'booking' ? <Map size={16} /> :
                                 notif.type === 'service_purchase' ? <Wallet size={16} /> :
                                 <ShieldAlert size={16} />}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: notif.is_read ? 600 : 700, color: '#0B192C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {notif.title}
                                  </p>
                                  <span style={{ fontSize: '0.7rem', color: '#9CA3AF', flexShrink: 0 }}>
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                  {notif.body}
                                </p>
                              </div>

                              {!notif.is_read && (
                                <div style={{ width: '7px', height: '7px', backgroundColor: '#0052D4', borderRadius: '50%', alignSelf: 'center', flexShrink: 0 }} />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Wallet badge - hidden for admins */}
              {!(isAdmin || user?.role === 'admin') && (
                <div className="tm-wallet-badge" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                }}
                  onClick={() => setIsFundModalOpen(true)}
                >
                  <Wallet size={16} style={{ color: '#0052D4' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0B192C' }}>
                    {balance !== null ? `₦${balance.toLocaleString()}` : '₦0'}
                  </span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0052D4, #00C9FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1,
                    boxShadow: '0 2px 8px rgba(0,82,212,0.3)',
                  }}>+</div>
                </div>
              )}

              {/* Role switcher */}
              {(user?.role === 'rider' || user?.role === 'driver') && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden',
                  fontSize: '0.78rem', fontWeight: 600,
                }}>
                  <button
                    onClick={() => { if (user.role !== 'rider' && !switching) { setSwitching(true); switchRole('rider').then(() => { navigate('/rider'); }).finally(() => setSwitching(false)); } }}
                    disabled={switching}
                    style={{
                      padding: '7px 14px', border: 'none', cursor: switching ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      background: user?.role === 'rider' ? 'linear-gradient(135deg, #0052D4, #00C9FF)' : 'transparent',
                      color: user?.role === 'rider' ? '#fff' : '#6B7280',
                    }}
                  >Rider</button>
                  <button
                    onClick={() => { if (user.role !== 'driver' && !switching) { setSwitching(true); switchRole('driver').then(() => { navigate(user.kycStatus === 'verified' || user.kycStatus === 'pending' ? '/driver' : '/onboarding'); }).finally(() => setSwitching(false)); } }}
                    disabled={switching}
                    style={{
                      padding: '7px 14px', border: 'none', cursor: switching ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      background: user?.role === 'driver' ? 'linear-gradient(135deg, #0052D4, #00C9FF)' : 'transparent',
                      color: user?.role === 'driver' ? '#fff' : '#6B7280',
                    }}
                  >Driver</button>
                </div>
              )}
              
              {/* User avatar - hidden on mobile */}
              <div style={{ display: isDesktop ? 'flex' : 'none', alignItems: 'center', gap: '10px', paddingLeft: '10px', borderLeft: '1px solid #E5E7EB' }}>
                <div style={{ textAlign: 'right', display: isDesktop ? 'block' : 'none' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, lineHeight: 1, color: '#0B192C' }}>{user?.firstName} {user?.lastName}</p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.7rem', color: '#0052D4', textTransform: 'capitalize', fontWeight: 600 }}>{user?.role}</p>
                </div>
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={`${user.firstName} ${user.lastName}`}
                    style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      objectFit: 'cover', boxShadow: '0 0 0 2px #0052D4, 0 4px 12px rgba(0,82,212,0.25)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0052D4 0%, #00E676 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800, color: '#fff',
                    boxShadow: '0 4px 14px rgba(0,82,212,0.35)',
                    letterSpacing: '0.02em',
                  }}>
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className={`dashboard-scroll tm-content-area${isAdmin ? ' tm-admin-main' : ''}`} style={{
            flex: 1, overflowY: 'auto', padding: noPadding ? 0 : (isDesktop ? '28px 24px' : '16px 6px'),
          }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
      {!(isAdmin || user?.role === 'admin') && (
        <FundWalletModal
          isOpen={isFundModalOpen}
          onClose={() => setIsFundModalOpen(false)}
          onSuccess={(newBalance) => setBalance(newBalance)}
        />
      )}
    </>
  );
};
