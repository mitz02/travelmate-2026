import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, User, ArrowRight, CheckCircle, Car, Star, MapPin, Phone, Calendar, Home } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [sessionToken, setSessionToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Start
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState('');

  // Step 3: Password
  const [password, setPassword] = useState('');

  // Step 4: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('male');

  // Step 5: Address
  const [stateStr, setStateStr] = useState('');
  const [localGovt, setLocalGovt] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/start', { email, phone, role });
      setSessionToken(res.data.sessionToken);
      setStep(3); // Skip phone OTP — go directly to password
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/verify-phone', { sessionToken, otp });
      setSessionToken(res.data.sessionToken);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/set-password', { sessionToken, password });
      setSessionToken(res.data.sessionToken);
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/personal-info', {
        sessionToken,
        firstName,
        lastName,
        surname,
        dateOfBirth,
        gender
      });
      setSessionToken(res.data.sessionToken);
      setStep(5);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save personal info.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/address', {
        sessionToken,
        state: stateStr,
        localGovt,
        ward,
        street,
        houseNumber
      });
      // Store final login token
      localStorage.setItem('token', res.data.token);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!userInfoRes.ok) throw new Error('Failed to fetch Google user info');
      const userInfo = await userInfoRes.json();

      const res = await api.post('/auth/google', {
        credential: tokenResponse.access_token,
        googleUserInfo: userInfo,
        role,
      });

      localStorage.setItem('token', res.data.token);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google sign-up failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const signUpWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google sign-up was cancelled or failed.'),
  });

  if (isSuccess) {
    return (
      <>
        <style>{`
          @keyframes successPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6D28D9 100%)',
          padding: '1rem',
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '3rem',
            maxWidth: '480px', width: '100%', textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ animation: 'successPop 0.6s ease-out forwards' }}>
              <CheckCircle size={72} color="#10B981" style={{ marginBottom: '1.5rem', display: 'inline-block' }} />
            </div>
            <h2 style={{
              fontSize: '1.75rem', fontWeight: 800, color: '#111827',
              marginBottom: '0.75rem', animation: 'fadeUp 0.5s ease-out 0.3s both',
            }}>
              Registration Complete!
            </h2>
            <p style={{
              color: '#6B7280', fontSize: '1rem', lineHeight: 1.6,
              marginBottom: '2rem', animation: 'fadeUp 0.5s ease-out 0.5s both',
            }}>
              Welcome to TravelMate. You are now ready to hit the road.
            </p>
            <div style={{ animation: 'fadeUp 0.5s ease-out 0.7s both' }}>
              <Button onClick={() => navigate('/rider')} fullWidth>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
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
        .register-left-panel {
          background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 40%, #2563EB 70%, #10B981 100%);
          background-size: 300% 300%;
          animation: gradientShift 10s ease infinite;
        }
        .register-form-enter {
          animation: slideInRight 0.4s ease-out forwards;
        }
        .register-float-card {
          animation: float 6s ease-in-out infinite;
        }
        .register-float-delay {
          animation: floatDelay 5s ease-in-out 1s infinite;
        }
        .register-float-delay2 {
          animation: float 7s ease-in-out 0.5s infinite;
        }
        @media (max-width: 768px) {
          .register-left-panel { display: none !important; }
          .register-right-panel { width: 100% !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        {/* Left Panel - Gradient */}
        <div
          className="register-left-panel"
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decoration */}
          <div style={{
            position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', right: '-10%', width: '350px', height: '350px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          {/* Logo */}
          <Link to="/" style={{
            position: 'absolute', top: '2rem', left: '2.5rem',
            color: 'white', fontSize: '1.5rem', fontWeight: 800, textDecoration: 'none',
          }}>
            TravelMate
          </Link>

          {/* Center content */}
          <div style={{ textAlign: 'center', zIndex: 2, maxWidth: '420px' }}>
            <h1 style={{
              color: 'white', fontSize: '2.5rem', fontWeight: 800,
              lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.02em',
            }}>
              Start your journey<br />with TravelMate
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem',
              lineHeight: 1.6, marginBottom: '3rem',
            }}>
              Join thousands of Nigerians who are already sharing rides,
              saving money, and building community.
            </p>
          </div>

          {/* Floating benefit cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 2, width: '100%', maxWidth: '360px' }}>
            <div className="register-float-card" style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex', flexShrink: 0,
              }}>
                <Car size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Share your ride</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>Split costs with fellow travelers</div>
              </div>
            </div>

            <div className="register-float-delay" style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex', flexShrink: 0,
              }}>
                <Star size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Verified community</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>All users are KYC verified</div>
              </div>
            </div>

            <div className="register-float-delay2" style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '0.5rem', display: 'flex', flexShrink: 0,
              }}>
                <MapPin size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Nationwide coverage</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>Routes across all 36 states</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Register Form */}
        <div
          className="register-right-panel"
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem 3rem',
            background: 'white',
            overflowY: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.75rem', fontWeight: 800, color: '#111827',
                marginBottom: '0.5rem', letterSpacing: '-0.02em',
              }}>
                {step === 1 && 'Create your account'}
                {step === 3 && 'Set your password'}
                {step === 4 && 'Personal Information'}
                {step === 5 && 'Registered Address'}
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
                {step === 1 && 'Join TravelMate today — it only takes a minute'}
                {step === 3 && 'Secure your account'}
                {step === 4 && 'Tell us a bit about yourself'}
                {step === 5 && 'Where are you located?'}
              </p>
            </div>

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

            {step === 1 && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>I want to...</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setRole('rider')}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                        border: role === 'rider' ? '2px solid #4F46E5' : '1px solid #D1D5DB',
                        background: role === 'rider' ? '#EEF2FF' : 'white',
                        color: role === 'rider' ? '#4F46E5' : '#374151',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      Ride
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      style={{
                        flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                        border: role === 'driver' ? '2px solid #4F46E5' : '1px solid #D1D5DB',
                        background: role === 'driver' ? '#EEF2FF' : 'white',
                        color: role === 'driver' ? '#4F46E5' : '#374151',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      Drive
                    </button>
                  </div>
                  {!role && (
                    <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
                      Please select whether you want to ride or drive to continue.
                    </p>
                  )}
                </div>

                <form onSubmit={handleStart} className="register-form-enter">
                  <div style={{ marginBottom: '1rem' }}>
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
                  <div style={{ marginBottom: '1.5rem' }}>
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="+234..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      leftIcon={<Phone size={18} />}
                      required
                    />
                  </div>
                  
                  <Button type="submit" fullWidth isLoading={isLoading} disabled={!email || !phone || !role}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      Continue <ArrowRight size={18} />
                    </span>
                  </Button>
                </form>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyPhone} className="register-form-enter">
                <div style={{ marginBottom: '1.5rem' }}>
                  <Input
                    label="6-Digit OTP"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" fullWidth isLoading={isLoading} disabled={otp.length !== 6}>
                  Verify Phone
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSetPassword} className="register-form-enter">
                <div style={{ marginBottom: '1.5rem' }}>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock size={18} />}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                    Must be at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.
                  </p>
                </div>
                <Button type="submit" fullWidth isLoading={isLoading} disabled={!password}>
                  Set Password
                </Button>
              </form>
            )}

            {step === 4 && (
              <form onSubmit={handlePersonalInfo} className="register-form-enter">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <Input
                    label="First Name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    leftIcon={<User size={18} />}
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    leftIcon={<User size={18} />}
                    required
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <Input
                    label="Surname"
                    placeholder="Smith"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    leftIcon={<User size={18} />}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Input
                    label="Date of Birth"
                    placeholder="MM/DD/YYYY"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    leftIcon={<Calendar size={18} />}
                    required
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Gender</label>
                    <select 
                      value={gender} 
                      onChange={e => setGender(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#111827', outline: 'none' }}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" fullWidth isLoading={isLoading} disabled={!firstName || !lastName || !surname || !dateOfBirth}>
                  Save Information
                </Button>
              </form>
            )}

            {step === 5 && (
              <form onSubmit={handleAddress} className="register-form-enter">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <Input
                    label="State"
                    placeholder="Lagos"
                    value={stateStr}
                    onChange={(e) => setStateStr(e.target.value)}
                    required
                  />
                  <Input
                    label="LGA"
                    placeholder="Ikeja"
                    value={localGovt}
                    onChange={(e) => setLocalGovt(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <Input
                    label="Ward"
                    placeholder="Ward 2"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Input
                    label="Street"
                    placeholder="Awolowo Way"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    leftIcon={<MapPin size={18} />}
                    required
                  />
                  <Input
                    label="House #"
                    placeholder="42"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    leftIcon={<Home size={18} />}
                    required
                  />
                </div>
                <Button type="submit" fullWidth isLoading={isLoading} disabled={!stateStr || !localGovt || !ward || !street || !houseNumber}>
                  Complete Registration
                </Button>
              </form>
            )}

            {step === 1 && (
              <>
                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  margin: '1.5rem 0', color: '#D1D5DB',
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 500 }}>or continue with</span>
                  <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                </div>

                {/* Google Sign-Up Button */}
                <button
                  id="google-signup-btn"
                  type="button"
                  onClick={() => signUpWithGoogle()}
                  disabled={isGoogleLoading || !role}
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
                    cursor: isGoogleLoading || !role ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    opacity: !role ? 0.6 : 1,
                    marginBottom: '1.25rem',
                  }}
                  onMouseEnter={e => { if (!isGoogleLoading && role) { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; } }}
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
                  {isGoogleLoading ? 'Creating account...' : 'Continue with Google'}
                </button>

                <p style={{
                  textAlign: 'center', fontSize: '0.9rem', color: '#6B7280',
                }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{
                    fontWeight: 700, color: '#4F46E5', textDecoration: 'none',
                  }}>
                    Sign in
                  </Link>
                </p>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};
