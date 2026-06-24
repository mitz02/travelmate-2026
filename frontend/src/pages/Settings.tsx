import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Bell, Lock, Shield, Moon, Globe, ShieldCheck, Copy, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import api from '../services/api';

const styles = {
  container: { width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '24px', paddingBottom: '40px' },
  header: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 },
  subtext: { color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.95rem' },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)', borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  },
  section: {
    padding: '24px 32px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  sectionLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconWrapper: {
    width: '40px', height: '40px', borderRadius: '10px',
    backgroundColor: '#EEF2FF', color: '#4F46E5',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  title: { margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' },
  desc: { margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' },
  toggleButton: (isActive: boolean) => ({
    position: 'relative' as const,
    width: '44px', height: '24px', borderRadius: '24px',
    backgroundColor: isActive ? '#10B981' : 'var(--border-color)',
    border: 'none', cursor: 'pointer', transition: 'background-color 0.2s',
    display: 'flex', alignItems: 'center'
  }),
  toggleKnob: (isActive: boolean) => ({
    position: 'absolute' as const,
    width: '20px', height: '20px', borderRadius: '50%',
    backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    left: isActive ? '22px' : '2px', transition: 'left 0.2s',
  }),
  buttonSecondary: {
    padding: '8px 16px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', 
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
};

const modalContent: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)', borderRadius: '16px', maxWidth: '480px', width: '100%',
  padding: '2rem', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
};

export const Settings: React.FC = () => {
  const [pushNotes, setPushNotes] = useState(true);
  const [emailNotes, setEmailNotes] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/auth/2fa/status').then(res => {
      setTwoFactor(res.data.enabled);
    }).catch(() => {});
  }, []);

  const handle2FAToggle = async () => {
    if (twoFactor) {
      const confirmed = window.confirm('Disable two-factor authentication? Enter your password to confirm.');
      if (!confirmed) return;
      const password = window.prompt('Enter your password to disable 2FA:');
      if (!password) return;
      try {
        await api.post('/auth/2fa/disable', { password });
        setTwoFactor(false);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to disable 2FA');
      }
      return;
    }

    setTwoFactorLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setShow2FAModal(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setIsVerifying(true);
    try {
      await api.post('/auth/2fa/verify', { token: verifyCode });
      setTwoFactor(true);
      setShow2FAModal(false);
      setVerifyCode('');
    } catch (err: any) {
      setVerifyError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div style={styles.container}>
        <div>
          <h1 style={styles.header}>Account Settings</h1>
          <p style={styles.subtext}>Manage your preferences, security, and application settings.</p>
        </div>

        <div style={styles.card}>
          <div style={styles.section}>
            <div style={styles.sectionLeft}>
              <div style={styles.iconWrapper}><Bell size={20} /></div>
              <div>
                <p style={styles.title}>Push Notifications</p>
                <p style={styles.desc}>Receive alerts for upcoming rides and messages.</p>
              </div>
            </div>
            <button style={styles.toggleButton(pushNotes)} onClick={() => setPushNotes(!pushNotes)}>
              <div style={styles.toggleKnob(pushNotes)} />
            </button>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionLeft}>
              <div style={{ ...styles.iconWrapper, backgroundColor: '#F0FDF4', color: '#10B981' }}><Shield size={20} /></div>
              <div>
                <p style={styles.title}>Email Notifications</p>
                <p style={styles.desc}>Get weekly summaries and promotional offers.</p>
              </div>
            </div>
            <button style={styles.toggleButton(emailNotes)} onClick={() => setEmailNotes(!emailNotes)}>
              <div style={styles.toggleKnob(emailNotes)} />
            </button>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionLeft}>
              <div style={{ ...styles.iconWrapper, backgroundColor: twoFactor ? '#F0FDF4' : '#FEF2F2', color: twoFactor ? '#10B981' : '#EF4444' }}><Lock size={20} /></div>
              <div>
                <p style={styles.title}>Two-Factor Authentication</p>
                <p style={styles.desc}>{twoFactor ? '2FA is enabled. Your account is protected.' : 'Add an extra layer of security to your account.'}</p>
              </div>
            </div>
            <button style={styles.toggleButton(twoFactor)} onClick={handle2FAToggle} disabled={twoFactorLoading}>
              <div style={styles.toggleKnob(twoFactor)} />
            </button>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionLeft}>
              <div style={{ ...styles.iconWrapper, backgroundColor: '#F3F4F6', color: '#374151' }}><Moon size={20} /></div>
              <div>
                <p style={styles.title}>Dark Mode</p>
                <p style={styles.desc}>{theme === 'dark' ? 'Dark theme is active.' : 'Switch to a dark theme for reduced eye strain.'}</p>
              </div>
            </div>
            <button style={styles.toggleButton(theme === 'dark')} onClick={toggleTheme}>
              <div style={styles.toggleKnob(theme === 'dark')} />
            </button>
          </div>

          <div style={{ ...styles.section, borderBottom: 'none' }}>
            <div style={styles.sectionLeft}>
              <div style={{ ...styles.iconWrapper, backgroundColor: '#FFFBEB', color: '#F59E0B' }}><Globe size={20} /></div>
              <div>
                <p style={styles.title}>Language & Region</p>
                <p style={styles.desc}>English (Nigeria), NGN Currency.</p>
              </div>
            </div>
            <button style={styles.buttonSecondary}>Change</button>
          </div>
        </div>
      </div>

      {show2FAModal && (
        <div style={modalOverlay} onClick={() => setShow2FAModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShow2FAModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <ShieldCheck size={40} color="#4F46E5" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Set Up Two-Factor Authentication</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              {qrCode ? (
                <img src={qrCode} alt="2FA QR Code" style={{ width: '200px', height: '200px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '200px', height: '200px', margin: '0 auto', borderRadius: '12px', backgroundColor: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Loading...
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--card-hover)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all', flex: 1 }}>{secret}</code>
              <button onClick={handleCopySecret} style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <form onSubmit={handleVerify2FA}>
              {verifyError && (
                <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', border: '1px solid #FECACA' }}>
                  {verifyError}
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Enter the 6-digit code from your authenticator app</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.5em', fontWeight: 700, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
              <Button type="submit" fullWidth isLoading={isVerifying} disabled={verifyCode.length < 6}>
                Verify & Enable 2FA
              </Button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
