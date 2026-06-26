import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import api from '../services/api';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import { toE164Phone } from '../utils/phone';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ArrowRight, CheckCircle, Phone, ShieldCheck } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'recaptcha-container';
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
    recaptchaContainerRef.current = container;
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      container.remove();
    };
  }, []);

  const startOtpCountdown = () => {
    let countdown = 60;
    setOtpResendTimer(countdown);
    const interval = setInterval(() => {
      countdown -= 1;
      setOtpResendTimer(countdown);
      if (countdown <= 0) clearInterval(interval);
    }, 1000);
  };

  const sendFirebaseOtp = async () => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* to your .env file.');
    }
    const e164Phone = toE164Phone(phone);
    const auth = getFirebaseAuth();
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, { size: 'invisible' });
    confirmationRef.current = await signInWithPhoneNumber(auth, e164Phone, recaptchaRef.current);
    startOtpCountdown();
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await sendFirebaseOtp();
      setStep(2);
    } catch (err: any) {
      if (err?.code === 'auth/error-code:-39' || err?.message?.includes('error-code:-39')) {
        setError('SMS delivery failed. This phone number may not be supported by Firebase in your region. Contact support.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError(err?.message || 'Failed to send OTP.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (submittingRef.current) return;
    setOtpLoading(true);
    setOtpError('');
    submittingRef.current = true;
    try {
      await sendFirebaseOtp();
    } catch (err: any) {
      if (err?.code === 'auth/error-code:-39' || err?.message?.includes('error-code:-39')) {
        setOtpError('SMS delivery failed. This phone number may not be supported by Firebase in your region. Contact support.');
      } else if (err?.code === 'auth/too-many-requests') {
        setOtpError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setOtpError(err?.message || 'Failed to resend OTP.');
      }
    } finally {
      setOtpLoading(false);
      submittingRef.current = false;
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setOtpLoading(true);
    setOtpError('');
    submittingRef.current = true;
    try {
      if (!confirmationRef.current) throw new Error('Please resend the verification code.');
      const code = otp.replace(/\s/g, '');
      const credential = await confirmationRef.current.confirm(code);
      const firebaseIdToken = await credential.user.getIdToken();
      const res = await api.post('/auth/verify-otp', { phone, firebaseIdToken });
      if (res.data?.verified) setStep(3);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-verification-code') {
        setOtpError('Invalid OTP.');
      } else if (err?.code === 'auth/code-expired') {
        setOtp('');
        setOtpError('Verification code expired. Click "Resend code" to get a new one.');
      } else if (err?.code === 'auth/too-many-requests') {
        setOtpError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setOtpError(err?.response?.data?.error || err?.message || 'Verification failed.');
      }
    } finally {
      setOtpLoading(false);
      submittingRef.current = false;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        email, phone, password, role,
        fullName: `${firstName} ${lastName}`.trim(),
        firstName, lastName,
      });
      if (res.data?.token) localStorage.setItem('token', res.data.token);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        const googleBody: Record<string, unknown> = { credential: tokenResponse.access_token, googleUserInfo: userInfo };
        if (role) googleBody.role = role;
        const res = await api.post('/auth/google', googleBody);
        localStorage.setItem('token', res.data.token);
        setIsSuccess(true);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Google sign-up failed.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => setError('Google sign-up was cancelled.'),
  });

  if (isSuccess) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <CheckCircle size={64} style={{ margin: '0 auto 1rem', color: '#22C55E' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1E293B' }}>Account Created!</h2>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>Welcome to TravelMate.</p>
          <Button onClick={() => navigate(role === 'driver' ? '/driver' : '/rider')} fullWidth>Get Started</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatDelay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .register-left-panel {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 40%, #6D28D9 70%, #4F46E5 100%);
          background-size: 300% 300%;
          animation: gradientShift 8s ease infinite;
        }
        .register-form-enter {
          animation: slideInRight 0.6s ease-out forwards;
        }
        .register-float-card {
          animation: float 6s ease-in-out infinite;
        }
        .register-float-card-delay {
          animation: floatDelay 5s ease-in-out 1s infinite;
        }
        .register-float-card-delay2 {
          animation: float 7s ease-in-out 0.5s infinite;
        }
        @media (max-width: 768px) {
          .register-left-panel { display: none !important; }
          .register-right-panel { width: 100% !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <div
          className="register-left-panel"
          style={{
            width: '55%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-15%', left: '-10%', width: '500px', height: '500px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '20%', left: '10%', width: '200px', height: '200px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
            animation: 'pulse-ring 4s ease-in-out infinite',
          }} />

          <Link to="/" style={{
            position: 'absolute', top: '2rem', left: '2.5rem',
            color: 'white', fontSize: '1.5rem', fontWeight: 800, textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}>
            TravelMate
          </Link>

          <div style={{ textAlign: 'center', zIndex: 2, maxWidth: '440px' }}>
            <h1 style={{
              color: 'white', fontSize: '2.5rem', fontWeight: 800,
              lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.02em',
            }}>
              Join the future<br />of travel
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem',
              lineHeight: 1.6, marginBottom: '3rem',
            }}>
              Create your TravelMate account and start your journey. Connect with verified drivers or earn as a driver.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', zIndex: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="register-float-card" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>50K+</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Rides Completed</div>
              </div>
            </div>

            <div className="register-float-card-delay" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>100%</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Verified Drivers</div>
              </div>
            </div>

            <div className="register-float-card-delay2" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem', display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>10K+</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Active Users</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="register-right-panel register-form-enter"
          style={{
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <Link to="/" style={{
              display: 'none',
              color: '#4F46E5', fontSize: '1.5rem', fontWeight: 800,
              textDecoration: 'none', marginBottom: '2rem',
            }} className="mobile-logo">
              TravelMate
            </Link>

            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                Create Account
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Step {step} of 3 — {step === 1 ? 'Enter your details' : step === 2 ? 'Verify your phone' : 'Set up your profile'}
              </p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.25rem', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStart}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={18} />} required />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="Phone Number" type="tel" placeholder="08166411207" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone size={18} />} required />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>I am a</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%', padding: '0.7rem 0.85rem', borderRadius: '0.625rem',
                      border: '1.5px solid var(--border-color)', background: 'var(--bg-color)',
                      color: role ? 'var(--text-main)' : 'var(--text-muted)',
                      fontSize: '0.875rem', fontFamily: "'Inter', sans-serif",
                      outline: 'none', transition: 'border-color 0.2s',
                      cursor: 'pointer',
                    }}
                    required
                  >
                    <option value="">Select role</option>
                    <option value="rider">Rider</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>

                <Button type="submit" fullWidth isLoading={isLoading} disabled={!email || !phone || !role}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    Send OTP <ArrowRight size={18} />
                  </span>
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="Verification Code" value={otp} onChange={(e) => setOtp(e.target.value)} leftIcon={<ShieldCheck size={18} />} maxLength={6} required />
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                  Code sent to <strong style={{ color: 'var(--text-main)' }}>{phone}</strong> via SMS
                </p>

                {otpError && (
                  <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.25rem', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {otpError}
                  </div>
                )}

                <Button type="submit" fullWidth isLoading={otpLoading} disabled={otp.length < 4}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    Verify <ArrowRight size={18} />
                  </span>
                </Button>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  {otpResendTimer > 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resend in {otpResendTimer}s</span>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={otpLoading} style={{ background: 'none', border: 'none', color: otpLoading ? '#94A3B8' : '#4F46E5', fontWeight: 600, fontSize: '0.875rem', cursor: otpLoading ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}>
                      {otpLoading ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSignup}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={18} />} required />
                </div>

                <Button type="submit" fullWidth isLoading={isLoading}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    Create Account <ArrowRight size={18} />
                  </span>
                </Button>
              </form>
            )}

            {(step === 1) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem 0', color: '#D1D5DB' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>or continue with</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                </div>

                <button
                  type="button"
                  onClick={() => signUpWithGoogle()}
                  disabled={isGoogleLoading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                    padding: '0.8rem 1.25rem', borderRadius: '0.625rem', border: '1.5px solid var(--border-color)',
                    background: isGoogleLoading ? 'var(--card-hover)' : 'var(--bg-card)', color: 'var(--text-main)',
                    fontSize: '0.925rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    cursor: isGoogleLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  {isGoogleLoading ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="var(--border-color)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {isGoogleLoading ? 'Signing up...' : 'Continue with Google'}
                </button>
              </>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
