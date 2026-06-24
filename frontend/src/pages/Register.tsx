import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import api from '../services/api';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import { toE164Phone } from '../utils/phone';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ArrowRight, CheckCircle, Phone, ShieldCheck, Loader2 } from 'lucide-react';

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
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
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
      setError(err?.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please wait and try again.'
        : err?.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      await sendFirebaseOtp();
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    try {
      if (!confirmationRef.current) throw new Error('Please resend the verification code.');
      const credential = await confirmationRef.current.confirm(otp);
      const firebaseIdToken = await credential.user.getIdToken();
      const res = await api.post('/auth/verify-otp', { phone, firebaseIdToken });
      if (res.data?.verified) setStep(3);
    } catch (err: any) {
      setOtpError(err?.code === 'auth/invalid-verification-code'
        ? 'Invalid OTP.'
        : err?.response?.data?.error || err?.message || 'Verification failed.');
    } finally {
      setOtpLoading(false);
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
        const res = await api.post('/auth/google', { credential: tokenResponse.access_token, googleUserInfo: userInfo, role });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-6">Welcome to TravelMate.</p>
          <Button onClick={() => navigate(role === 'driver' ? '/driver' : '/rider')}>Get Started</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
      <div ref={recaptchaContainerRef} id="recaptcha-container" />
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-bold mb-1">Create Account</h1>
        <p className="text-gray-500 text-sm mb-6">Step {step} of 3</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleStart} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={18} />} required />
            <Input label="Phone" type="tel" placeholder="08166411207" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone size={18} />} required />
            <div>
              <label className="text-sm font-medium text-gray-700">I am a</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 border rounded-xl px-3 py-2.5" required>
                <option value="">Select role</option>
                <option value="rider">Rider</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            <Button type="submit" fullWidth isLoading={isLoading} disabled={!email || !phone || !role}>
              Send OTP <ArrowRight size={16} className="ml-1 inline" />
            </Button>
            <Button type="button" variant="outline" fullWidth onClick={() => signUpWithGoogle()} isLoading={isGoogleLoading}>
              Continue with Google
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input label="Verification code" value={otp} onChange={(e) => setOtp(e.target.value)} leftIcon={<ShieldCheck size={18} />} maxLength={6} required />
            <p className="text-xs text-gray-500 text-center">Code sent to {phone} via Firebase SMS</p>
            {otpError && <div className="text-red-600 text-sm">{otpError}</div>}
            <Button type="submit" fullWidth isLoading={otpLoading} disabled={otp.length < 4}>Verify</Button>
            {otpResendTimer > 0 ? (
              <p className="text-center text-xs text-gray-400">Resend in {otpResendTimer}s</p>
            ) : (
              <button type="button" onClick={handleResendOtp} className="w-full text-indigo-600 text-sm font-medium">Resend code</button>
            )}
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSignup} className="space-y-4">
            <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={18} />} required />
            <Button type="submit" fullWidth isLoading={isLoading}>Create Account</Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-indigo-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
