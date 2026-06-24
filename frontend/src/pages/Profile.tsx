import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const styles = {
  container: { width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  header: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  subtext: { color: '#6B7280', margin: '4px 0 0 0', fontSize: '0.95rem' },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB', borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    padding: '32px'
  },
  avatarContainer: {
    display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px',
    paddingBottom: '32px', borderBottom: '1px solid #E5E7EB'
  },
  avatar: {
    width: '100px', height: '100px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    color: '#fff', fontSize: '2.5rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)'
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  inputContainer: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute' as const, left: '16px', color: '#9CA3AF' },
  input: {
    width: '100%', padding: '12px 16px 12px 48px', borderRadius: '8px', 
    border: '1px solid #D1D5DB', boxSizing: 'border-box' as const, fontSize: '0.95rem',
    color: '#111827', backgroundColor: '#fff', transition: 'border-color 0.2s'
  },
  buttonPrimary: {
    padding: '14px 28px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', 
    borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 12px',
    borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #A7F3D0'
  },
  alertSuccess: {
    backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46',
    padding: '16px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center',
    marginBottom: '24px'
  }
};

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'TM';

  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMsg('');
    
    try {
      await api.put('/profile/me', {
        firstName,
        lastName,
        phone
      });
      updateUser({ firstName, lastName, phone });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error: any) {
      console.error('Failed to update profile', error);
      setErrorMsg(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={styles.container}>
        <div>
          <h1 style={styles.header}>My Profile</h1>
          <p style={styles.subtext}>Manage your personal information and account settings.</p>
        </div>

        {success && (
          <div style={styles.alertSuccess} className="animate-fade-in">
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 500 }}>Your profile has been successfully updated!</span>
          </div>
        )}
        
        {errorMsg && (
          <div style={{...styles.alertSuccess, backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B'}} className="animate-fade-in">
            <span style={{ fontWeight: 500 }}>{errorMsg}</span>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.avatarContainer}>
            <div style={styles.avatar}>{initials}</div>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                {firstName} {lastName}
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} /> {email}
                </span>
                <div style={styles.badge}>
                  <ShieldCheck size={14} /> Verified Account
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <div style={styles.inputContainer}>
                  <User size={18} style={styles.inputIcon} />
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={styles.input} required />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <div style={styles.inputContainer}>
                  <User size={18} style={styles.inputIcon} />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={styles.input} required />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputContainer}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required disabled />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>Email cannot be changed</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <div style={styles.inputContainer}>
                  <Phone size={18} style={styles.inputIcon} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} required />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                style={{ ...styles.buttonPrimary, width: 'auto', opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};
