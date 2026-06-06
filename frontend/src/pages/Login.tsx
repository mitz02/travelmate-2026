import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ArrowRight, MapPin, Shield, Users } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.token, {
        id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.first_name,
        lastName: response.data.user.last_name,
        role: response.data.user.role,
        kycStatus: response.data.user.kyc_status,
        profilePicture: response.data.user.profile_picture,
      });

      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else if (response.data.user.role === 'driver') {
        navigate('/driver');
      } else {
        navigate('/rider');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setError('');
    setIsGoogleLoading(true);
    try {
      // Exchange access token for user info, then send to our backend
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!userInfoRes.ok) throw new Error('Failed to fetch Google user info');
      const userInfo = await userInfoRes.json();

      const res = await api.post('/auth/google', {
        credential: tokenResponse.access_token,
        googleUserInfo: userInfo,
      });

      login(res.data.token, {
        id: res.data.user.id,
        email: res.data.user.email,
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        role: res.data.user.role,
        kycStatus: res.data.user.kycStatus,
        profilePicture: res.data.user.profilePicture,
      });

      if (res.data.user.role === 'admin') navigate('/admin');
      else if (res.data.user.role === 'driver') navigate('/driver');
      else navigate('/rider');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const signInWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google sign-in was cancelled or failed.'),
  });

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
        .login-left-panel {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 40%, #6D28D9 70%, #4F46E5 100%);
          background-size: 300% 300%;
          animation: gradientShift 8s ease infinite;
        }
        .login-form-enter {
          animation: slideInRight 0.6s ease-out forwards;
        }
        .login-float-card {
          animation: float 6s ease-in-out infinite;
        }
        .login-float-card-delay {
          animation: floatDelay 5s ease-in-out 1s infinite;
        }
        .login-float-card-delay2 {
          animation: float 7s ease-in-out 0.5s infinite;
        }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { width: 100% !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        {/* Left Panel - Gradient with floating elements */}
        <div
          className="login-left-panel"
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
          {/* Background decoration circles */}
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

          {/* Logo */}
          <Link to="/" style={{
            position: 'absolute', top: '2rem', left: '2.5rem',
            color: 'white', fontSize: '1.5rem', fontWeight: 800, textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}>
            TravelMate
          </Link>

          {/* Center content */}
          <div style={{ textAlign: 'center', zIndex: 2, maxWidth: '440px' }}>
            <h1 style={{
              color: 'white', fontSize: '2.5rem', fontWeight: 800,
              lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.02em',
            }}>
              Welcome back to<br />smarter travel
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem',
              lineHeight: 1.6, marginBottom: '3rem',
            }}>
              Your next journey is just a login away. Connect with verified drivers and ride comfortably across Nigeria.
            </p>
          </div>

          {/* Floating stat cards */}
          <div style={{ display: 'flex', gap: '1rem', zIndex: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="login-float-card" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex',
              }}>
                <MapPin size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>50K+</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Rides Completed</div>
              </div>
            </div>

            <div className="login-float-card-delay" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex',
              }}>
                <Shield size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>100%</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Verified Drivers</div>
              </div>
            </div>

            <div className="login-float-card-delay2" style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex',
              }}>
                <Users size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>10K+</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Active Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div
          className="login-right-panel login-form-enter"
          style={{
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            background: 'white',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Mobile logo */}
            <Link to="/" style={{
              display: 'none',
              color: '#4F46E5', fontSize: '1.5rem', fontWeight: 800,
              textDecoration: 'none', marginBottom: '2rem',
            }} className="mobile-logo">
              TravelMate
            </Link>

            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontSize: '1.75rem', fontWeight: 800, color: '#111827',
                marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>
                Sign in
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleLogin}>
              {error && (
                <div style={{
                  background: '#FEF2F2', color: '#DC2626', padding: '0.75rem 1rem',
                  borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1.25rem',
                  border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={18} />}
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock size={18} />}
                  required
                />
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.75rem',
              }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.875rem', color: '#6B7280', cursor: 'pointer',
                }}>
                  <input type="checkbox" style={{ accentColor: '#4F46E5', width: '16px', height: '16px' }} />
                  Remember me
                </label>
                <a href="#" style={{
                  fontSize: '0.875rem', fontWeight: 600, color: '#4F46E5',
                  textDecoration: 'none',
                }}>
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                disabled={!email || !password}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  Sign In <ArrowRight size={18} />
                </span>
              </Button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              margin: '1.75rem 0', color: '#D1D5DB',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
            </div>

            {/* Google Sign-In Button */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={isGoogleLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.8rem 1.25rem',
                borderRadius: '0.625rem',
                border: '1.5px solid #E5E7EB',
                background: isGoogleLoading ? '#F9FAFB' : 'white',
                color: '#374151',
                fontSize: '0.925rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                marginBottom: '1.5rem',
              }}
              onMouseEnter={e => { if (!isGoogleLoading) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isGoogleLoading ? '#F9FAFB' : 'white'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
            >
              {isGoogleLoading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3"/>
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
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <p style={{
              textAlign: 'center', fontSize: '0.9rem', color: '#6B7280',
            }}>
              Don't have an account?{' '}
              <Link to="/register" style={{
                fontWeight: 700, color: '#4F46E5', textDecoration: 'none',
              }}>
                Sign up for free
              </Link>
            </p>

          </div>
        </div>
      </div>
    </>
  );
};
