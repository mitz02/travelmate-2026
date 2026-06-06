import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  CreditCard,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  Menu,
  X,
  ChevronRight,
  Car,
  Clock,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';

/* ──────────────────────────── animations (injected once) ──────────────── */
const animationStyles = `
@keyframes heroGradient {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-12px); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-60px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes navSlide {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

/* smooth scroll */
html { scroll-behavior: smooth; }

/* hide scrollbar on mobile menu */
.tm-mobile-menu::-webkit-scrollbar { display: none; }

/* responsive helpers */
@media (max-width: 768px) {
  .tm-hero-heading  { font-size: 2.5rem !important; line-height: 1.15 !important; }
  .tm-hero-sub      { font-size: 1rem !important; }
  .tm-stats-row     { flex-direction: column !important; gap: 1rem !important; }
  .tm-hero-btns     { flex-direction: column !important; width: 100% !important; }
  .tm-hero-btns a   { width: 100% !important; text-align: center !important; justify-content: center !important; }
  .tm-steps-row     { flex-direction: column !important; }
  .tm-features-grid { grid-template-columns: 1fr !important; }
  .tm-testimonials  { grid-template-columns: 1fr !important; }
  .tm-footer-grid   { grid-template-columns: 1fr !important; text-align: center !important; }
  .tm-nav-links     { display: none !important; }
  .tm-nav-actions   { display: none !important; }
  .tm-menu-toggle   { display: flex !important; }
  .tm-section       { padding: 4rem 1rem !important; }
  .tm-cta-heading   { font-size: 1.75rem !important; }
}
@media (min-width: 769px) {
  .tm-menu-toggle   { display: none !important; }
  .tm-mobile-drawer { display: none !important; }
}
`;

/* ──────────────────────── reusable style helpers ──────────────────────── */
const container: React.CSSProperties = {
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 1.5rem',
};

/* ──────────────────────────── component ───────────────────────────────── */
export const Home: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ─── data ─── */
  const steps = [
    { icon: <CheckCircle size={28} />, num: '01', title: 'Sign Up', desc: 'Create your free account in under a minute. Verify your identity and you\'re good to go.' },
    { icon: <MapPin size={28} />,      num: '02', title: 'Find a Ride', desc: 'Enter your destination and browse available rides. Filter by time, price, or rating.' },
    { icon: <Car size={28} />,         num: '03', title: 'Travel Together', desc: 'Meet your co-travellers, share the cost, and enjoy a safe and comfortable ride.' },
  ];

  const features = [
    { icon: <Shield size={32} />,     title: 'Safe & Verified',     desc: 'Every rider and driver is identity-verified. NIN & BVN checks keep the community secure.' },
    { icon: <MapPin size={32} />,     title: 'Real-time Tracking',  desc: 'Share your live location with loved ones. Track your ride from pickup to destination.' },
    { icon: <CreditCard size={32} />, title: 'Easy Payments',       desc: 'Pay seamlessly via Paystack — cards, bank transfers, and USSD. No cash needed.' },
    { icon: <Users size={32} />,      title: 'Community Driven',    desc: 'Ratings, reviews, and a vibrant rider community ensure a great experience every time.' },
  ];

  const testimonials = [
    { quote: 'TravelMate completely changed how I commute from Lekki to the Island. I save over ₦40k monthly and I\'ve made real friends!', name: 'Adaeze Okafor', role: 'Product Designer, Lagos', stars: 5 },
    { quote: 'As a driver, the extra income is fantastic. The verification process made me trust the platform from day one.', name: 'Emeka Nwosu', role: 'Software Engineer, Abuja', stars: 5 },
    { quote: 'I was sceptical at first, but the safety features won me over. Real-time tracking gives my family peace of mind.', name: 'Fatima Bello', role: 'Medical Student, Ibadan', stars: 5 },
  ];

  return (
    <>
      <style>{animationStyles}</style>

      {/* ════════════ 1. NAVBAR ════════════ */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: scrolled ? '0.65rem 0' : '1rem 0',
          background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(229,231,235,0.6)' : 'none',
          transition: 'all 0.35s ease',
          animation: 'navSlide 0.5s ease-out',
        }}
      >
        <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Car size={20} color="#fff" />
            </div>
            <span style={{
              fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em',
              color: scrolled ? '#111827' : '#fff',
              transition: 'color 0.3s',
            }}>
              Travel<span style={{ color: '#10B981' }}>Mate</span>
            </span>
          </Link>

          {/* desktop links */}
          <div className="tm-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Home', 'How It Works', 'Features', 'About'].map((label) => {
              const id = label === 'Home' ? 'hero' : label === 'About' ? 'testimonials' : label.toLowerCase().replace(/\s+/g, '-');
              return (
                <button
                  key={label}
                  onClick={() => scrollTo(id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: scrolled ? '#374151' : 'rgba(255,255,255,0.85)',
                    fontSize: '0.925rem', fontWeight: 500, transition: 'color 0.25s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* desktop actions */}
          <div className="tm-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/login"
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                color: scrolled ? '#4F46E5' : '#fff',
                border: `1.5px solid ${scrolled ? '#4F46E5' : 'rgba(255,255,255,0.5)'}`,
                background: 'transparent', transition: 'all 0.25s',
              }}
            >
              Log In
            </Link>
            <Link
              to="/register"
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                color: '#fff', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                border: 'none', transition: 'transform 0.2s',
              }}
            >
              Sign Up
            </Link>
          </div>

          {/* mobile toggle */}
          <button
            className="tm-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: scrolled ? '#111827' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* mobile drawer */}
        {menuOpen && (
          <div
            className="tm-mobile-drawer tm-mobile-menu"
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', borderBottom: '1px solid #E5E7EB',
              padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16,
              animation: 'fadeInDown 0.25s ease-out',
            }}
          >
            {['Home', 'How It Works', 'Features', 'About'].map((label) => {
              const id = label === 'Home' ? 'hero' : label === 'About' ? 'testimonials' : label.toLowerCase().replace(/\s+/g, '-');
              return (
                <button
                  key={label}
                  onClick={() => scrollTo(id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#374151', fontSize: '1rem', fontWeight: 500,
                    textAlign: 'left', padding: '0.5rem 0',
                  }}
                >
                  {label}
                </button>
              );
            })}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Link to="/login" style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: 8, fontWeight: 600, border: '1.5px solid #4F46E5', color: '#4F46E5' }}>Log In</Link>
              <Link to="/register" style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: 8, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>Sign Up</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════ 2. HERO ════════════ */}
      <section
        id="hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(-45deg, #4F46E5, #7C3AED, #6D28D9, #10B981, #4F46E5)',
          backgroundSize: '400% 400%',
          animation: 'heroGradient 16s ease infinite',
        }}
      >
        {/* decorative blobs */}
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
          top: '-10%', right: '-10%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          bottom: '-10%', left: '-8%', pointerEvents: 'none',
        }} />

        <div style={{ ...container, position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: '6rem', paddingBottom: '4rem' }}>
          {/* pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 50, padding: '0.4rem 1.1rem',
            color: '#fff', fontSize: '0.85rem', fontWeight: 500,
            marginBottom: '1.75rem',
            animation: 'fadeInDown 0.6s ease-out',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
            Now available across Nigeria
          </div>

          <h1
            className="tm-hero-heading"
            style={{
              fontSize: '4rem',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#fff',
              letterSpacing: '-0.03em',
              maxWidth: 800,
              margin: '0 auto 1.5rem',
              animation: 'fadeInUp 0.7s ease-out',
            }}
          >
            Your Journey,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #A5F3FC, #10B981, #A5F3FC)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s linear infinite',
            }}>
              Shared Smarter.
            </span>
          </h1>

          <p
            className="tm-hero-sub"
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255,255,255,0.8)',
              maxWidth: 620,
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
              animation: 'fadeInUp 0.8s ease-out',
            }}
          >
            Nigeria&rsquo;s smartest ride-sharing platform. Split costs, reduce traffic, and connect
            with verified travellers heading your way. Commuting reimagined.
          </p>

          {/* CTA buttons */}
          <div
            className="tm-hero-btns"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              marginBottom: '3.5rem',
              animation: 'fadeInUp 0.9s ease-out',
            }}
          >
            <Link
              to="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '0.85rem 2rem', borderRadius: 12,
                background: '#fff', color: '#4F46E5',
                fontSize: '1rem', fontWeight: 700,
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)'; }}
            >
              Get Started <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => scrollTo('how-it-works')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '0.85rem 2rem', borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff', fontSize: '1rem', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.25s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              Learn More <ChevronRight size={18} />
            </button>
          </div>

          {/* stat cards */}
          <div
            className="tm-stats-row"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              animation: 'fadeInUp 1s ease-out',
            }}
          >
            {[
              { value: '10K+', label: 'Active Users', icon: <Users size={20} /> },
              { value: '50K+', label: 'Rides Completed', icon: <Car size={20} /> },
              { value: '24/7', label: 'Support', icon: <Clock size={20} /> },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 16,
                  padding: '1.25rem 2rem',
                  minWidth: 170,
                  animation: `float 5s ease-in-out ${i * 0.6}s infinite`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#A5F3FC', marginBottom: 4 }}>
                  {stat.icon}
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{stat.value}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* bottom wave */}
        <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
            <path d="M0 60L60 54C120 48 240 36 360 42C480 48 600 72 720 78C840 84 960 72 1080 60C1200 48 1320 36 1380 30L1440 24V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V60Z" fill="#F3F4F6" />
          </svg>
        </div>
      </section>,

      {/* ════════════ 3. HOW IT WORKS ════════════ */}
      <section
        id="how-it-works"
        className="tm-section"
        style={{ padding: '6rem 1.5rem', background: '#F3F4F6' }}
      >
        <div style={{ ...container }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#4F46E5', background: '#E0E7FF', borderRadius: 50, padding: '0.35rem 1rem',
              marginBottom: '1rem',
            }}>
              Simple Process
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              How TravelMate Works
            </h2>
            <p style={{ color: '#6B7280', maxWidth: 560, margin: '0.75rem auto 0', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Getting started takes less than two minutes. Here&rsquo;s how it works.
            </p>
          </div>

          <div className="tm-steps-row" style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  flex: '1 1 0',
                  maxWidth: 340,
                  background: '#fff',
                  borderRadius: 20,
                  padding: '2.25rem 1.75rem',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  animation: `fadeInUp 0.6s ease-out ${i * 0.15}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(79,70,229,0.13)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)'; }}
              >
                {/* step number */}
                <div style={{
                  position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
                }}>
                  {step.num}
                </div>
                {/* icon */}
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: '#E0E7FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0.75rem auto 1.25rem', color: '#4F46E5',
                }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.925rem', color: '#6B7280', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 4. FEATURES ════════════ */}
      <section
        id="features"
        className="tm-section"
        style={{ padding: '6rem 1.5rem', background: '#fff' }}
      >
        <div style={{ ...container }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#10B981', background: '#D1FAE5', borderRadius: 50, padding: '0.35rem 1rem',
              marginBottom: '1rem',
            }}>
              Why TravelMate
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Features You&rsquo;ll Love
            </h2>
            <p style={{ color: '#6B7280', maxWidth: 560, margin: '0.75rem auto 0', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Built for the Nigerian commuter — safe, affordable, and community-first.
            </p>
          </div>

          <div
            className="tm-features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem',
              maxWidth: 880,
              margin: '0 auto',
            }}
          >
            {features.map((f, i) => (
              <div
                key={f.title}
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid #E5E7EB',
                  borderRadius: 20,
                  padding: '2rem 1.75rem',
                  transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
                  animation: `scaleIn 0.5s ease-out ${i * 0.12}s both`,
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(79,70,229,0.1)';
                  e.currentTarget.style.borderColor = '#C7D2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: i % 2 === 0 ? 'linear-gradient(135deg, #E0E7FF, #C7D2FE)' : 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i % 2 === 0 ? '#4F46E5' : '#059669',
                  marginBottom: '1.25rem',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '0.45rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.925rem', color: '#6B7280', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 5. TESTIMONIALS ════════════ */}
      <section
        id="testimonials"
        className="tm-section"
        style={{ padding: '6rem 1.5rem', background: '#F3F4F6' }}
      >
        <div style={{ ...container }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#7C3AED', background: '#EDE9FE', borderRadius: 50, padding: '0.35rem 1rem',
              marginBottom: '1rem',
            }}>
              Testimonials
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
              Loved by Nigerians
            </h2>
            <p style={{ color: '#6B7280', maxWidth: 560, margin: '0.75rem auto 0', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Don&rsquo;t just take our word for it — hear from our community.
            </p>
          </div>

          <div
            className="tm-testimonials"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}
          >
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: '2rem 1.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  animation: `fadeInUp 0.5s ease-out ${i * 0.15}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)'; }}
              >
                {/* stars */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.7, flex: 1 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* avatar placeholder */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                  }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#111827' }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 6. CTA BANNER ════════════ */}
      <section style={{
        padding: '5rem 1.5rem',
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* subtle decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 300, height: 300,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 220, height: 220,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        <div style={{ ...container, textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h2
            className="tm-cta-heading"
            style={{
              fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
              maxWidth: 640, margin: '0 auto 1rem',
            }}
          >
            Ready to Start Your Journey?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Join thousands of Nigerians who are already saving money and making connections through TravelMate.
          </p>
          <Link
            to="/register"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.9rem 2.5rem', borderRadius: 12,
              background: '#fff', color: '#4F46E5',
              fontSize: '1.05rem', fontWeight: 700,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)'; }}
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ════════════ 7. FOOTER ════════════ */}
      <footer style={{ background: '#0F172A', padding: '4rem 1.5rem 2rem', color: '#94A3B8' }}>
        <div style={{ ...container }}>
          <div
            className="tm-footer-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '2.5rem',
              paddingBottom: '2.5rem',
              borderBottom: '1px solid #1E293B',
            }}
          >
            {/* brand col */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={18} color="#fff" />
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Travel<span style={{ color: '#10B981' }}>Mate</span>
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 300 }}>
                Making ride-sharing safe, affordable, and social for every Nigerian commuter.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: '1.25rem' }}>
                {[Globe, Phone, Mail].map((Icon, i) => (
                  <div
                    key={i}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 0.25s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                  >
                    <Icon size={16} color="#94A3B8" />
                  </div>
                ))}
              </div>
            </div>

            {/* link cols */}
            {[
              { title: 'Product', links: ['How It Works', 'Features', 'Pricing', 'FAQ'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  {col.title}
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{
                          fontSize: '0.9rem', color: '#94A3B8', transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#E2E8F0'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#94A3B8'; }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* copyright */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: '1.75rem', fontSize: '0.82rem', color: '#64748B', gap: '0.75rem',
          }}>
            <span>&copy; {new Date().getFullYear()} TravelMate. All rights reserved.</span>
            <span>Built with 💚 in Nigeria</span>
          </div>
        </div>
      </footer>
    </>
  );
};
