import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Bell, Lock, Shield, Moon, Globe } from 'lucide-react';

const styles = {
  container: { width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  header: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  subtext: { color: '#6B7280', margin: '4px 0 0 0', fontSize: '0.95rem' },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB', borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden'
  },
  section: {
    padding: '24px 32px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  sectionLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconWrapper: {
    width: '40px', height: '40px', borderRadius: '10px',
    backgroundColor: '#EEF2FF', color: '#4F46E5',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  title: { margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: '#111827' },
  desc: { margin: 0, fontSize: '0.875rem', color: '#6B7280' },
  toggleButton: (isActive: boolean) => ({
    position: 'relative' as const,
    width: '44px', height: '24px', borderRadius: '24px',
    backgroundColor: isActive ? '#10B981' : '#E5E7EB',
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
    padding: '8px 16px', backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB', 
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export const Settings: React.FC = () => {
  const [pushNotes, setPushNotes] = useState(true);
  const [emailNotes, setEmailNotes] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
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
              <div style={{ ...styles.iconWrapper, backgroundColor: '#FEF2F2', color: '#EF4444' }}><Lock size={20} /></div>
              <div>
                <p style={styles.title}>Two-Factor Authentication</p>
                <p style={styles.desc}>Add an extra layer of security to your account.</p>
              </div>
            </div>
            <button style={styles.toggleButton(twoFactor)} onClick={() => setTwoFactor(!twoFactor)}>
              <div style={styles.toggleKnob(twoFactor)} />
            </button>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionLeft}>
              <div style={{ ...styles.iconWrapper, backgroundColor: '#F3F4F6', color: '#374151' }}><Moon size={20} /></div>
              <div>
                <p style={styles.title}>Dark Mode</p>
                <p style={styles.desc}>Switch between light and dark theme (Preview).</p>
              </div>
            </div>
            <button style={styles.toggleButton(darkMode)} onClick={() => setDarkMode(!darkMode)}>
              <div style={styles.toggleKnob(darkMode)} />
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
    </DashboardLayout>
  );
};
