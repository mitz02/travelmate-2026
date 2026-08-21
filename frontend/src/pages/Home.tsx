import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Download,
  Smartphone,
  Zap,
  Route,
  Sparkles,
} from 'lucide-react';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ──────────────────────────── animations (injected once) ──────────────── */
const animationStyles = `
@keyframes heroGradient {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.05); }
}
@keyframes drawLine {
  from { stroke-dashoffset: 1000; }
  to   { stroke-dashoffset: 0; }
}
@keyframes pinPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
  50%      { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
}
@keyframes floatSlow {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%      { transform: translateY(-10px) rotate(2deg); }
}
@keyframes orbit {
  from { transform: rotate(0deg) translateX(140px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
}
@keyframes dashMove {
  to { stroke-dashoffset: -20; }
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
@keyframes borderGlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── unique button system ── */
.tm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  border-radius: 50px; font-weight: 700; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  position: relative; text-decoration: none; border: none; outline: none;
}
.tm-btn::before {
  content: ''; position: absolute; inset: -2px; border-radius: 52px;
  z-index: -1; opacity: 0; transition: opacity 0.3s;
}
.tm-btn-primary {
  padding: 0.9rem 2.25rem; font-size: 1rem; color: #fff;
  background: linear-gradient(135deg, #10B981, #059669);
  box-shadow: 0 4px 24px rgba(16,185,129,0.35);
}
.tm-btn-primary::before {
  background: linear-gradient(135deg, #10B981, #6EE7B7, #34D399, #059669, #10B981);
  background-size: 300% 300%; animation: borderGlow 3s ease infinite;
}
.tm-btn-primary:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 10px 40px rgba(16,185,129,0.5);
}
.tm-btn-primary:hover::before { opacity: 1; }

.tm-btn-secondary {
  padding: 0.9rem 2.25rem; font-size: 1rem;
  background: rgba(255,255,255,0.05); backdrop-filter: blur(12px);
  border: 2px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.9);
}
.tm-btn-secondary:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(16,185,129,0.5);
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(16,185,129,0.2);
}

.tm-btn-dark {
  padding: 0.85rem 1.75rem; font-size: 0.9rem; color: #fff;
  background: linear-gradient(135deg, #1F2937, #111827);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.tm-btn-dark::before {
  background: linear-gradient(135deg, #374151, #6B7280, #374151);
  background-size: 200% 200%; animation: borderGlow 4s ease infinite;
}
.tm-btn-dark:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 28px rgba(0,0,0,0.3);
}
.tm-btn-dark:hover::before { opacity: 1; }

.tm-btn-sm { padding: 0.55rem 1.35rem !important; font-size: 0.9rem !important; }
.tm-btn-lg { padding: 1rem 2.5rem !important; font-size: 1.05rem !important; }

/* scroll-reveal */
.tm-reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.tm-reveal.tm-visible {
  opacity: 1;
  transform: translateY(0);
}
.tm-reveal-left {
  opacity: 0;
  transform: translateX(-50px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.tm-reveal-left.tm-visible {
  opacity: 1;
  transform: translateX(0);
}
.tm-reveal-right {
  opacity: 0;
  transform: translateX(50px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.tm-reveal-right.tm-visible {
  opacity: 1;
  transform: translateX(0);
}
.tm-reveal-scale {
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.tm-reveal-scale.tm-visible {
  opacity: 1;
  transform: scale(1);
}
.tm-stagger-1 { transition-delay: 0s !important; }
.tm-stagger-2 { transition-delay: 0.1s !important; }
.tm-stagger-3 { transition-delay: 0.2s !important; }
.tm-stagger-4 { transition-delay: 0.3s !important; }
.tm-stagger-5 { transition-delay: 0.4s !important; }
.tm-stagger-6 { transition-delay: 0.5s !important; }

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
  .tm-hero-content  { flex-direction: column !important; text-align: center !important; padding-top: 8rem !important; padding-bottom: 3rem !important; gap: 2rem !important; }
  .tm-hero-content > div { max-width: 100% !important; width: 100% !important; }
  .tm-hero-right    { display: flex !important; justify-content: center !important; min-height: auto !important; overflow: visible !important; }
  .tm-hero-right > div { width: 320px !important; height: 520px !important; transform: scale(0.65) !important; transform-origin: center top !important; margin-bottom: -180px !important; }
  #hero > div       { text-align: center !important; }
  .tm-steps-row     { flex-direction: column !important; }
  .tm-features-grid { grid-template-columns: 1fr !important; }
  .tm-testimonials  { grid-template-columns: 1fr !important; }
  .tm-footer-grid   { grid-template-columns: 1fr !important; text-align: center !important; }
  .tm-nav-links     { display: none !important; }
  .tm-nav-actions   { display: none !important; }
  .tm-menu-toggle   { display: flex !important; }
  .tm-section       { padding: 4rem 1rem !important; }
  .tm-cta-heading   { font-size: 1.75rem !important; }
  .tm-split-row     { flex-direction: column !important; gap: 2.5rem !important; }
  .tm-split-row > div { flex: 1 1 100% !important; max-width: 100% !important; }
  .tm-why-image     { position: relative !important; }
  .tm-why-image img { height: 300px !important; }
  .tm-why-text      { text-align: center !important; }
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

  /* ─── scroll-reveal hooks ─── */
  const howItWorks = useInView();
  const howItWorksTitle = useInView();
  const howStep1 = useInView();
  const howStep2 = useInView();
  const howStep3 = useInView();
  const featuresLeft = useInView();
  const featuresRight = useInView();
  const featCard1 = useInView();
  const featCard2 = useInView();
  const featCard3 = useInView();
  const featCard4 = useInView();
  const testimonialsTitle = useInView();
  const testimonial1 = useInView();
  const testimonial2 = useInView();
  const testimonial3 = useInView();
  const whyTitle = useInView();
  const whyImage = useInView();
  const whyText = useInView();
  const coverageMap = useInView();
  const coverageStats = useInView();
  const downloadLeft = useInView();
  const downloadRight = useInView();
  const ctaBanner = useInView();
  const footerCol1 = useInView();
  const footerCol2 = useInView();
  const footerCol3 = useInView();
  const footerCol4 = useInView();

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
            <a
              href="#download"
              className="tm-btn tm-btn-primary tm-btn-sm"
            >
              <Download size={16} />
              Download App
            </a>
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
            <a
              href="#download"
              className="tm-btn tm-btn-primary"
              style={{ width: '100%', marginTop: 8 }}
            >
              <Download size={16} />
              Download App
            </a>
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
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
        }}
      >
        {/* Background image - left side */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundAttachment: 'fixed',
          opacity: 0.35,
          pointerEvents: 'none',
        }} />

        {/* Dark overlay gradient — heavier on left for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(15,12,41,0.95) 0%, rgba(15,12,41,0.8) 40%, rgba(15,12,41,0.4) 70%, rgba(15,12,41,0.2) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Accent glow */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          top: '20%', left: '5%', pointerEvents: 'none',
          animation: 'pulse 6s ease-in-out infinite',
        }} />

        <div className="tm-hero-content" style={{ ...container, position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3rem', paddingTop: '7rem', paddingBottom: '6rem' }}>
          {/* Left — Text content */}
          <div style={{ flex: '1 1 50%', maxWidth: 560 }}>
            {/* pill badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50, padding: '0.5rem 1.25rem',
              color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 500,
              marginBottom: '1.75rem',
              animation: 'fadeInDown 0.6s ease-out',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 12px rgba(16,185,129,0.6)',
                animation: 'pulse 2s infinite',
              }} />
              Now available across Nigeria
            </div>

            <h1
              className="tm-hero-heading"
              style={{
                fontSize: '3.75rem',
                fontWeight: 800,
                lineHeight: 1.1,
                color: '#fff',
                letterSpacing: '-0.04em',
                marginBottom: '1.25rem',
                animation: 'fadeInUp 0.7s ease-out',
              }}
            >
              Your Journey,{' '}
              <span style={{
                background: 'linear-gradient(90deg, #10B981, #6EE7B7, #34D399, #10B981)',
                backgroundSize: '300% auto',
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
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.75,
                marginBottom: '2.25rem',
                animation: 'fadeInUp 0.8s ease-out',
              }}
            >
              Split costs, reduce traffic, and connect with verified travellers heading your way.
            </p>

            {/* CTA buttons */}
            <div
              className="tm-hero-btns"
              style={{
                display: 'flex',
                gap: 14,
                marginBottom: '3rem',
                animation: 'fadeInUp 0.9s ease-out',
              }}
            >
              <a
                href="#download"
                className="tm-btn tm-btn-primary"
              >
                Download App <ArrowRight size={18} />
              </a>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="tm-btn tm-btn-secondary"
              >
                See How It Works <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Right — decorative / image space */}
          <div className="tm-hero-right" style={{
            flex: '1 1 40%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: 600,
          }}>
            {/* Mobile Mockup */}
            <div style={{
              width: 320,
              height: 650,
              borderRadius: 45,
              background: '#fff',
              border: '10px solid #111',
              boxShadow: '0 30px 90px rgba(0,0,0,0.5), inset 0 0 0 2px #333',
              position: 'relative',
              overflow: 'hidden',
              animation: 'scaleIn 0.8s ease-out',
            }}>
              {/* iPhone Notch */}
              <div style={{
                position: 'absolute',
                top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 140, height: 28,
                background: '#111',
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                zIndex: 10
              }} />
              
              {/* Map Background Placeholder */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: '#e5e3df',
                overflow: 'hidden'
              }}>
                {/* Real Map iframe (pointerEvents none to prevent scrolling in mockup) */}
                <iframe 
                  title="Nigeria Map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=2.5,4.0,14.5,14.0&amp;layer=mapnik" 
                  style={{
                    position: 'absolute', top: -50, left: -50, width: 'calc(100% + 100px)', height: 'calc(100% + 100px)', 
                    border: 'none', pointerEvents: 'none', opacity: 0.8, filter: 'saturate(0.7) contrast(1.1)'
                  }}
                />

                {/* Animated Route Line SVG */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 11 }}>
                  {/* Base path */}
                  <path d="M120,90 L180,240 L100,380" fill="none" stroke="rgba(37, 99, 235, 0.3)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Animated dashed path */}
                  <path d="M120,90 L180,240 L100,380" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 12" style={{ animation: 'dashMove 1s linear infinite' }} />
                </svg>

                {/* Markers */}
                {/* Sokoto */}
                <div style={{ position: 'absolute', top: 90, left: 120, transform: 'translate(-50%, -50%)', zIndex: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#fff', color: '#000', padding: '6px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: 8, whiteSpace: 'nowrap', animation: 'float 3s ease-in-out infinite' }}>
                    Sokoto
                  </div>
                  <div style={{ width: 18, height: 18, background: '#F59E0B', borderRadius: '50%', border: '3px solid #fff', position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', animation: 'pinPulse 2s infinite' }}>
                  </div>
                </div>

                {/* Abuja */}
                <div style={{ position: 'absolute', top: 240, left: 180, transform: 'translate(-50%, -50%)', zIndex: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#111', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', marginBottom: 8, whiteSpace: 'nowrap', animation: 'float 3s ease-in-out infinite 0.5s' }}>
                    Abuja (Hub)
                  </div>
                  <div style={{ width: 22, height: 22, background: '#10B981', borderRadius: '50%', border: '3px solid #fff', position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', animation: 'pinPulse 2s infinite 0.5s' }}>
                  </div>
                </div>

                {/* Lagos */}
                <div style={{ position: 'absolute', top: 380, left: 100, transform: 'translate(-50%, -50%)', zIndex: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ background: '#fff', color: '#000', padding: '6px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: 8, whiteSpace: 'nowrap', animation: 'float 3s ease-in-out infinite 1s' }}>
                    Lagos
                  </div>
                  <div style={{ width: 18, height: 18, background: '#4F46E5', borderRadius: '50%', border: '3px solid #fff', position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', animation: 'pinPulse 2s infinite 1s' }}>
                  </div>
                </div>
              </div>

              {/* Bottom Sheet */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                background: '#fff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: '24px 20px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                zIndex: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', padding: '14px', borderRadius: 14, marginBottom: 14, border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Car size={36} color="#4F46E5" />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111' }}>Interstate Travel</div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Connecting Nigeria</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111' }}>
                    ₦ 8,500+
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F9FAFB', padding: '12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, border: '1px solid #E5E7EB', color: '#374151' }}>
                    <Clock size={16} /> Schedule
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F9FAFB', padding: '12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, border: '1px solid #E5E7EB', color: '#374151' }}>
                    <CreditCard size={16} /> Pay Online
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  padding: '16px',
                  borderRadius: 14,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#000'}
                >
                  Find a Ride
                </button>
              </div>
            </div>
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
          <div ref={howItWorksTitle.ref} className={`tm-reveal tm-stagger-1 ${howItWorksTitle.visible ? 'tm-visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
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

          <div ref={howItWorks.ref} className={`tm-reveal tm-stagger-2 ${howItWorks.visible ? 'tm-visible' : ''} tm-steps-row`} style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
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
        style={{ padding: '6rem 1.5rem', background: '#F8FAFC', position: 'relative' }}
      >
        <div className="tm-split-row" style={{ ...container, display: 'flex', alignItems: 'center', gap: '4.5rem' }}>
          {/* left — text + features grid */}
          <div ref={featuresLeft.ref} className={`tm-reveal-left tm-stagger-1 ${featuresLeft.visible ? 'tm-visible' : ''}`} style={{ flex: '1 1 52%' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#4F46E5', background: '#EEF2FF', border: '1px solid #E0E7FF',
              borderRadius: 50, padding: '0.4rem 1.1rem',
              marginBottom: '1.25rem',
            }}>
              <Sparkles size={14} color="#4F46E5" /> Why TravelMate
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: '0.85rem', lineHeight: 1.15 }}>
              Features You&rsquo;ll <span style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Love</span>
            </h2>
            <p style={{ color: '#64748B', maxWidth: 480, fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2.25rem' }}>
              Built specifically for modern Nigerian travelers — safe, premium, affordable, and community-first.
            </p>

            <div
              className="tm-features-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.25rem',
              }}
            >
              {features.map((f, i) => (
                <div
                  key={f.title}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '1.4rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid #F1F5F9',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: `scaleIn 0.5s ease-out ${i * 0.1}s both`,
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(79,70,229,0.1)';
                    e.currentTarget.style.borderColor = '#C7D2FE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#F1F5F9';
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: i === 0 ? 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' : i === 1 ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : i === 2 ? 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' : 'linear-gradient(135deg, #FAF5FF, #F3E8FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i === 0 ? '#4F46E5' : i === 1 ? '#059669' : i === 2 ? '#D97706' : '#7C3AED',
                    marginBottom: '1rem',
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.35rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* right — handsome driver image panel */}
          <div ref={featuresRight.ref} className={`tm-reveal-right tm-stagger-2 ${featuresRight.visible ? 'tm-visible' : ''} tm-why-image`} style={{ flex: '1 1 48%', position: 'relative' }}>
            <div style={{
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(15,23,42,0.15)',
              position: 'relative',
              height: 490,
              background: '#0F172A',
            }}>
              <img
                src="/driver1.jpg"
                alt="Handsome Black driver in modern car"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.1) 60%, transparent 100%)' }} />
            </div>

            {/* Floating Top Driver Badge */}
            <div style={{
              position: 'absolute', top: 24, left: -20,
              background: '#FFFFFF',
              borderRadius: 18, padding: '0.85rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
              border: '1px solid #F1F5F9',
              animation: 'float 4s ease-in-out infinite',
              zIndex: 3,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1rem',
              }}>
                <Shield size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Verified Captain <CheckCircle size={14} color="#10B981" fill="#10B981" />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Top 1% Rated in Nigeria</div>
              </div>
            </div>

            {/* Floating Bottom Trip Card */}
            <div style={{
              position: 'absolute', bottom: -20, right: 10,
              background: '#FFFFFF',
              borderRadius: 20, padding: '1rem 1.35rem',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 20px 45px rgba(15,23,42,0.14)',
              border: '1px solid #F1F5F9',
              animation: 'float 4.5s ease-in-out infinite 0.8s',
              zIndex: 3,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4F46E5' }}>4.98 ★</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>RATING</div>
              </div>
              <div style={{ width: 1, height: 32, background: '#E2E8F0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>1,850+</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>COMPLETED TRIPS</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 5. TESTIMONIALS ════════════ */}
      <section
        id="testimonials"
        className="tm-section"
        style={{ padding: '6rem 1.5rem', background: '#F3F4F6', position: 'relative' }}
      >
        {/* subtle top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #4F46E5, #10B981, transparent)',
          opacity: 0.4,
        }} />

        <div style={{ ...container }}>
          <div ref={testimonialsTitle.ref} className={`tm-reveal tm-stagger-1 ${testimonialsTitle.visible ? 'tm-visible' : ''}`} style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
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
            ref={testimonial1.ref}
            className={`tm-reveal tm-stagger-2 ${testimonial1.visible ? 'tm-visible' : ''} tm-testimonials`}
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
                  padding: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  animation: `fadeInUp 0.5s ease-out ${i * 0.15}s both`,
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(79,70,229,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)'; }}
              >
                {/* top accent bar */}
                <div style={{
                  height: 4,
                  background: i === 0
                    ? 'linear-gradient(90deg, #4F46E5, #7C3AED)'
                    : i === 1
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                }} />

                <div style={{ padding: '1.75rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {/* quote icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: i === 0
                      ? 'linear-gradient(135deg, #E0E7FF, #C7D2FE)'
                      : i === 1
                      ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)'
                      : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i === 0 ? '#4F46E5' : i === 1 ? '#059669' : '#D97706',
                    fontSize: '1rem', fontWeight: 900,
                    lineHeight: 1,
                  }}>
                    &ldquo;
                  </div>

                  {/* stars */}
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} size={15} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>

                  <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.75, flex: 1 }}>
                    {t.quote}
                  </p>
                </div>

                {/* author — separated footer */}
                <div style={{
                  padding: '1rem 1.75rem',
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#FAFAFA',
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{t.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 5b. WHY TRAVELMATE — Commuting Made Effortless ════════════ */}
      <section style={{ padding: '6rem 1.5rem', background: '#FFFFFF', position: 'relative' }}>
        <div className="tm-split-row" style={{ ...container, display: 'flex', alignItems: 'center', gap: '4.5rem' }}>

          {/* left — image container with floating phone mockups */}
          <div ref={whyImage.ref} className={`tm-reveal-left tm-stagger-1 ${whyImage.visible ? 'tm-visible' : ''} tm-why-image`} style={{ flex: '1 1 50%', position: 'relative', minHeight: 520 }}>
            {/* Main Image Container */}
            <div style={{
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(15,23,42,0.12)',
              position: 'relative',
              height: 520,
              background: '#0F172A',
            }}>
              <img
                src="/driver2.jpg"
                alt="Handsome Black commuter enjoying ride"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.65) 100%)' }} />
            </div>

            {/* Left Phone Mockup (Abuja -> Lagos) */}
            <div style={{
              position: 'absolute', bottom: 25, left: -20,
              width: 200, height: 320,
              borderRadius: 24, background: '#FFFFFF',
              border: '8px solid #0F172A',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              zIndex: 4, animation: 'float 4s ease-in-out infinite 0.5s',
            }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 75, height: 16, background: '#0F172A', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, zIndex: 10 }} />
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=2.5,5.5,8.5,10.0&layer=mapnik" style={{ position: 'absolute', top: -10, left: -10, width: 'calc(100% + 60px)', height: 'calc(100% + 60px)', border: 0, pointerEvents: 'none', filter: 'grayscale(0.1)' }} />
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}>
                  <path d="M165,50 L32,180" fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeDasharray="6,6" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                </svg>
                <div style={{ position: 'absolute', top: 180, left: 32, width: 14, height: 14, background: '#4F46E5', borderRadius: '50%', border: '2px solid #fff', transform: 'translate(-50%,-50%)', zIndex: 3, boxShadow: '0 2px 8px rgba(79,70,229,0.5)' }} />
              </div>
              <div style={{ background: '#fff', padding: '12px', zIndex: 5, position: 'relative', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%', animation: 'pulse 1.2s infinite' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A' }}>Finding your ride...</div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Abuja ➔ Lagos</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981' }}>₦8,500</div>
                </div>
              </div>
            </div>

            {/* Right Phone Mockup (Driver Found) */}
            <div style={{
              position: 'absolute', bottom: -20, right: -15,
              width: 220, height: 350,
              borderRadius: 28, background: '#FFFFFF',
              border: '9px solid #0F172A',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              zIndex: 5, animation: 'float 4.2s ease-in-out infinite',
            }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 85, height: 18, background: '#0F172A', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, zIndex: 10 }} />
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=2.5,5.5,8.5,10.0&layer=mapnik" style={{ position: 'absolute', top: -10, left: -10, width: 'calc(100% + 60px)', height: 'calc(100% + 60px)', border: 0, pointerEvents: 'none', filter: 'grayscale(0.1)' }} />
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}>
                  <path d="M34,165 L170,180" fill="none" stroke="#4F46E5" strokeWidth="5" strokeLinecap="round" strokeDasharray="7,7" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                </svg>
                <div style={{ position: 'absolute', top: 172, left: 102, transform: 'translate(-50%,-50%)', background: '#fff', padding: '6px', borderRadius: '50%', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', zIndex: 3 }}>
                  <Car size={15} color="#10B981" />
                </div>
              </div>
              <div style={{ background: '#fff', padding: '16px 14px', zIndex: 5, position: 'relative', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Driver Arriving</div>
                  <span style={{ fontSize: '0.65rem', background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>Confirmed</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>3 mins away</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', padding: '8px 10px', borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #EEF2FF, #C7D2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#4F46E5" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Emeka Nwosu</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={11} fill="#F59E0B" color="#F59E0B" /> 4.9 · Toyota Hiace
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* right — text content & interactive feature cards */}
          <div ref={whyText.ref} className={`tm-reveal-right tm-stagger-2 ${whyText.visible ? 'tm-visible' : ''} tm-why-text`} style={{ flex: '1 1 50%' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#10B981', background: '#ECFDF5', border: '1px solid #D1FAE5',
              borderRadius: 50, padding: '0.4rem 1.1rem',
              marginBottom: '1.25rem',
            }}>
              <Zap size={14} color="#10B981" /> Seamless Experience
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: '1rem' }}>
              Commuting Made <span style={{ background: 'linear-gradient(135deg, #10B981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Effortless</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.75, marginBottom: '2.25rem' }}>
              From booking a ride to arriving comfortably at your destination, TravelMate automates the heavy lifting so you can travel with complete peace of mind.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {[
                { icon: <Shield size={22} />, title: '100% Verified Community', desc: 'Every user passes government-backed NIN & BVN checks before booking or driving.', color: '#10B981', bg: '#ECFDF5', badge: 'Bank-Grade Security' },
                { icon: <MapPin size={22} />, title: 'Live Interstate Tracking', desc: 'Share your live route, ETA, and emergency pin with trusted family members in real-time.', color: '#4F46E5', bg: '#EEF2FF', badge: 'Real-time GPS' },
                { icon: <CreditCard size={22} />, title: 'Secure Escrow Payments', desc: 'Paystack-powered escrow holds your funds safely until you reach your destination.', color: '#F59E0B', bg: '#FFFBEB', badge: 'Zero Cash Hassle' },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: 'flex', gap: 16, alignItems: 'flex-start',
                    background: '#FFFFFF', borderRadius: 20, padding: '1.35rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid #F1F5F9',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(6px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#F1F5F9';
                  }}
                >
                  <div style={{
                    width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                    background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.color,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{item.title}</div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: item.color, background: item.bg, padding: '2px 8px', borderRadius: 12 }}>
                        {item.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 5bb. COVERAGE MAP — animated ════════════ */}
      <section style={{
        padding: '7rem 1.5rem',
        background: 'linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* bg glows */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 60%)', top: '-15%', left: '-10%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 60%)', bottom: '-15%', right: '-5%', pointerEvents: 'none' }} />

        {/* grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        }} />

        <div ref={coverageMap.ref} className={`tm-reveal tm-stagger-1 ${coverageMap.visible ? 'tm-visible' : ''}`} style={{ ...container, position: 'relative', zIndex: 2, textAlign: 'center' }}>
          {/* header */}
          <span style={{
            display: 'inline-block',
            fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 50, padding: '0.35rem 1rem',
            marginBottom: '1rem',
            animation: 'fadeInDown 0.6s ease-out',
          }}>
            Nationwide Coverage
          </span>
          <h2 style={{
            fontSize: '2.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
            animation: 'fadeInUp 0.6s ease-out',
          }}>
            We operate across{' '}
            <span style={{
              background: 'linear-gradient(90deg, #10B981, #6EE7B7, #34D399)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s linear infinite',
            }}>
              36 States
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto 3.5rem', lineHeight: 1.7 }}>
            From Lagos to Kano, Port Harcourt to Abuja — TravelMate connects you everywhere.
          </p>

          {/* big map + floating cards */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
            {/* floating left card */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '1.25rem 1.5rem',
              animation: 'floatSlow 5s ease-in-out infinite',
              textAlign: 'left',
              minWidth: 180,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>50K+</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Rides Completed</div>
                </div>
              </div>
            </div>

            {/* THE MAP */}
            <div style={{ position: 'relative', animation: 'scaleIn 0.8s ease-out' }}>
              <svg width="480" height="540" viewBox="0 0 480 540" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="mapFill" x1="60" y1="30" x2="420" y2="500" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgba(79,70,229,0.12)" />
                    <stop offset="0.5" stopColor="rgba(16,185,129,0.1)" />
                    <stop offset="1" stopColor="rgba(124,58,237,0.08)" />
                  </linearGradient>
                  <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <linearGradient id="routeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Nigeria outline — larger, smoother */}
                <path
                  d="M240 15 C260 15, 280 22, 295 30 C315 40, 335 45, 360 52 C380 58, 400 70, 415 85 C430 100, 440 120, 445 140 C450 160, 452 180, 452 200 C452 220, 448 240, 442 258 C436 276, 428 292, 418 306 C408 320, 395 332, 380 342 C365 352, 348 360, 330 368 C312 376, 295 382, 278 386 C260 390, 242 392, 225 394 C208 396, 190 396, 172 394 C154 392, 136 388, 120 380 C104 372, 90 360, 78 346 C66 332, 56 315, 48 298 C40 280, 34 262, 30 244 C26 226, 24 208, 24 190 C24 172, 26 154, 32 138 C38 122, 46 108, 58 96 C70 84, 84 74, 100 66 C116 58, 132 52, 148 48 C164 44, 178 38, 192 32 C204 26, 218 20, 228 17 C234 16, 238 15, 240 15 Z"
                  fill="url(#mapFill)"
                  stroke="rgba(16,185,129,0.35)"
                  strokeWidth="2.5"
                />

                {/* animated route lines */}
                <path d="M140 190 Q200 130, 260 170 Q310 205, 290 290" stroke="url(#routeGrad1)" strokeWidth="3" strokeDasharray="10 6" fill="none" opacity="0.6">
                  <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="3s" fill="freeze" />
                  <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M170 260 Q220 230, 280 250 Q340 270, 320 340" stroke="url(#routeGrad2)" strokeWidth="3" strokeDasharray="10 6" fill="none" opacity="0.5">
                  <animate attributeName="stroke-dashoffset" from="800" to="0" dur="3.5s" fill="freeze" />
                  <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="2.5s" repeatCount="indefinite" />
                </path>
                <path d="M120 230 Q170 280, 210 260 Q250 240, 270 300" stroke="#7C3AED" strokeWidth="2.5" strokeDasharray="8 5" fill="none" opacity="0.4">
                  <animate attributeName="stroke-dashoffset" from="600" to="0" dur="4s" fill="freeze" />
                  <animate attributeName="stroke-dashoffset" from="0" to="-26" dur="3s" repeatCount="indefinite" />
                </path>
                <path d="M280 170 Q310 140, 340 130" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 4" fill="none" opacity="0.4">
                  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze" />
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
                </path>

                {/* city pins with pulse */}
                {/* Lagos */}
                <circle cx="130" cy="260" r="14" fill="rgba(16,185,129,0.2)" filter="url(#glow)">
                  <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="130" cy="260" r="7" fill="#10B981" stroke="#fff" strokeWidth="2.5" />
                <text x="90" y="290" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" opacity="0.9">Lagos</text>

                {/* Abuja */}
                <circle cx="250" cy="185" r="14" fill="rgba(79,70,229,0.2)" filter="url(#glow)">
                  <animate attributeName="r" values="14;18;14" dur="2.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="250" cy="185" r="7" fill="#4F46E5" stroke="#fff" strokeWidth="2.5" />
                <text x="265" y="182" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" opacity="0.9">Abuja</text>

                {/* Kano */}
                <circle cx="280" cy="90" r="12" fill="rgba(245,158,11,0.2)" filter="url(#glow)">
                  <animate attributeName="r" values="12;16;12" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="280" cy="90" r="6" fill="#F59E0B" stroke="#fff" strokeWidth="2.5" />
                <text x="295" y="88" fill="#fff" fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" opacity="0.9">Kano</text>

                {/* orbiting dot */}
                <circle r="4" fill="#10B981" opacity="0.7">
                  <animateMotion dur="12s" repeatCount="indefinite" path="M240 15 C260 15, 280 22, 295 30 C315 40, 335 45, 360 52 C380 58, 400 70, 415 85 C430 100, 440 120, 445 140 C450 160, 452 180, 452 200 C452 220, 448 240, 442 258 C436 276, 428 292, 418 306 C408 320, 395 332, 380 342 C365 352, 348 360, 330 368 C312 376, 295 382, 278 386 C260 390, 242 392, 225 394 C208 396, 190 396, 172 394 C154 392, 136 388, 120 380 C104 372, 90 360, 78 346 C66 332, 56 315, 48 298 C40 280, 34 262, 30 244 C26 226, 24 208, 24 190 C24 172, 26 154, 32 138 C38 122, 46 108, 58 96 C70 84, 84 74, 100 66 C116 58, 132 52, 148 48 C164 44, 178 38, 192 32 C204 26, 218 20, 228 17 C234 16, 238 15, 240 15 Z" />
                </circle>
              </svg>
            </div>

            {/* floating right card */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '1.25rem 1.5rem',
              animation: 'floatSlow 6s ease-in-out 1s infinite',
              textAlign: 'left',
              minWidth: 180,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>10K+</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 5c. DOWNLOAD APP — image right ════════════ */}
      <section id="download" style={{ padding: '6rem 1.5rem', background: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
        {/* subtle bg glow */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)',
          top: '-20%', left: '10%', pointerEvents: 'none',
        }} />

        <div className="tm-split-row" style={{ ...container, display: 'flex', alignItems: 'center', gap: '4rem', position: 'relative', zIndex: 2 }}>
          {/* left — text */}
          <div ref={downloadLeft.ref} className={`tm-reveal-left tm-stagger-1 ${downloadLeft.visible ? 'tm-visible' : ''}`} style={{ flex: '1 1 45%' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#7C3AED', background: '#EDE9FE', borderRadius: 50, padding: '0.35rem 1rem',
              marginBottom: '1rem',
            }}>
              Get the App
            </span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1rem' }}>
              Your Ride is{' '}
              <span style={{ color: '#10B981' }}>One Tap Away</span>
            </h2>
            <p style={{ fontSize: '1rem', color: '#6B7280', lineHeight: 1.75, marginBottom: '2rem' }}>
              Download TravelMate and start sharing rides today. Available on iOS and Android — free forever.
            </p>

            {/* download buttons */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a
                href="#"
                className="tm-btn tm-btn-dark"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.65-2.2.46-3.06-.4C3.79 16.17 4.36 9.02 8.93 8.78c1.27.07 2.15.74 2.91.78.88-.18 1.73-.9 2.74-.82 1.16.1 2.04.6 2.62 1.5-2.39 1.43-1.82 4.56.52 5.44-.62 1.6-1.42 3.18-2.67 4.6zM12.05 8.67c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7, lineHeight: 1 }}>Download on the</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="tm-btn tm-btn-dark"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.394 12l2.304-2.492zM5.864 3.455l10.937 6.333-2.302 2.302-8.635-8.635z"/></svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7, lineHeight: 1 }}>Get it on</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>Google Play</div>
                </div>
              </a>
            </div>

            {/* mini stats */}
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
              {[
                { val: '4.9', label: 'App Rating' },
                { val: '100K+', label: 'Downloads' },
                { val: '#1', label: 'in Ride-sharing' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>{s.val}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right — Nigeria map */}
          <div ref={downloadRight.ref} className={`tm-reveal-right tm-stagger-2 ${downloadRight.visible ? 'tm-visible' : ''}`} style={{ flex: '1 1 45%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* glow behind map */}
            <div style={{
              position: 'absolute', width: 380, height: 380, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', animation: 'scaleIn 0.7s ease-out' }}>
              <svg width="340" height="420" viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Nigeria outline */}
                <path
                  d="M170 10 C185 10, 200 15, 210 20 C225 28, 240 30, 260 35 C275 39, 290 48, 300 58 C310 68, 318 82, 322 95 C326 108, 330 125, 330 140 C330 155, 328 170, 324 185 C320 200, 315 215, 310 228 C305 240, 298 252, 290 262 C282 272, 272 280, 260 288 C248 296, 235 302, 220 308 C205 314, 190 318, 175 322 C160 326, 145 328, 130 328 C115 328, 100 325, 85 318 C70 311, 58 300, 48 288 C38 276, 30 260, 25 245 C20 230, 18 215, 16 200 C14 185, 14 170, 16 155 C18 140, 22 125, 28 112 C34 98, 42 86, 52 76 C62 66, 75 58, 88 52 C100 46, 112 42, 125 38 C138 34, 150 28, 158 22 C162 18, 166 14, 170 10 Z"
                  fill="url(#nigeriaGradient)"
                  stroke="rgba(16,185,129,0.4)"
                  strokeWidth="2"
                />
                {/* gradient def */}
                <defs>
                  <linearGradient id="nigeriaGradient" x1="50" y1="30" x2="290" y2="320" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgba(79,70,229,0.15)" />
                    <stop offset="0.5" stopColor="rgba(16,185,129,0.12)" />
                    <stop offset="1" stopColor="rgba(124,58,237,0.1)" />
                  </linearGradient>
                </defs>

                {/* route lines */}
                <path d="M120 140 Q170 100, 200 130 Q230 160, 210 220" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="6 4" fill="none" opacity="0.5" />
                <path d="M150 200 Q180 180, 220 195 Q250 210, 240 260" stroke="#10B981" strokeWidth="2.5" strokeDasharray="6 4" fill="none" opacity="0.5" />
                <path d="M100 180 Q130 210, 160 200 Q190 190, 200 230" stroke="#7C3AED" strokeWidth="2" strokeDasharray="5 4" fill="none" opacity="0.4" />

                {/* city pins */}
                {/* Lagos */}
                <circle cx="100" cy="205" r="8" fill="#10B981" opacity="0.9" />
                <circle cx="100" cy="205" r="4" fill="#fff" />
                <text x="70" y="230" fill="#374151" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">Lagos</text>

                {/* Abuja */}
                <circle cx="180" cy="150" r="8" fill="#4F46E5" opacity="0.9" />
                <circle cx="180" cy="150" r="4" fill="#fff" />
                <text x="195" y="145" fill="#374151" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">Abuja</text>

                {/* Kano */}
                <circle cx="200" cy="75" r="8" fill="#F59E0B" opacity="0.9" />
                <circle cx="200" cy="75" r="4" fill="#fff" />
                <text x="215" y="72" fill="#374151" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">Kano</text>

                {/* Port Harcourt */}
                <circle cx="230" cy="250" r="7" fill="#7C3AED" opacity="0.9" />
                <circle cx="230" cy="250" r="3.5" fill="#fff" />
                <text x="244" y="254" fill="#374151" fontSize="10" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">PH</text>

                {/* Ibadan */}
                <circle cx="130" cy="190" r="6" fill="#EF4444" opacity="0.8" />
                <circle cx="130" cy="190" r="3" fill="#fff" />
                <text x="110" y="178" fill="#374151" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">Ibadan</text>
              </svg>

              {/* floating card */}
              <div style={{
                position: 'absolute', top: 20, right: -10,
                background: '#fff', borderRadius: 14,
                padding: '0.75rem 1rem',
                boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'float 4s ease-in-out infinite',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Route size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>36 States</div>
                  <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>Covered Nationwide</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 6. CTA BANNER ════════════ */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
      }}>
        {/* top wave */}
        <div style={{ position: 'absolute', top: -2, left: 0, right: 0, lineHeight: 0, zIndex: 2 }}>
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', display: 'block', transform: 'rotate(180deg)' }}>
            <path d="M0 40L48 36C96 32 192 24 288 28C384 32 480 48 576 56C672 64 768 64 864 56C960 48 1056 32 1152 28C1248 24 1344 32 1392 36L1440 40V100H0V40Z" fill="#F3F4F6" />
          </svg>
        </div>

        {/* Background image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.25,
          pointerEvents: 'none',
        }} />

        {/* dark overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(15,12,41,0.88) 0%, rgba(48,43,99,0.85) 50%, rgba(15,12,41,0.9) 100%)',
          pointerEvents: 'none',
        }} />

        {/* accent glows */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          top: '-20%', right: '10%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
          bottom: '-15%', left: '15%', pointerEvents: 'none',
        }} />

        <div ref={ctaBanner.ref} className={`tm-reveal tm-stagger-1 ${ctaBanner.visible ? 'tm-visible' : ''}`} style={{ ...container, textAlign: 'center', position: 'relative', zIndex: 3, padding: '7rem 1.5rem 6rem' }}>
          {/* badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 50, padding: '0.4rem 1.1rem',
            color: '#6EE7B7', fontSize: '0.82rem', fontWeight: 600,
            marginBottom: '1.75rem',
            animation: 'fadeInDown 0.5s ease-out',
          }}>
            <CheckCircle size={14} />
            Free to join — no hidden fees
          </div>

          <h2
            className="tm-cta-heading"
            style={{
              fontSize: '2.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
              maxWidth: 640, margin: '0 auto 1rem',
              lineHeight: 1.15,
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            Ready to Start{' '}
            <span style={{
              background: 'linear-gradient(90deg, #10B981, #6EE7B7, #34D399)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s linear infinite',
            }}>
              Your Journey?
            </span>
          </h2>

          <p style={{
            color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', maxWidth: 480,
            margin: '0 auto 2.5rem', lineHeight: 1.75,
            animation: 'fadeInUp 0.7s ease-out',
          }}>
            Join thousands of Nigerians already saving money and making connections through TravelMate.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, animation: 'fadeInUp 0.8s ease-out' }}>
            <a
              href="#download"
              className="tm-btn tm-btn-primary tm-btn-lg"
            >
              Download App <ArrowRight size={18} />
            </a>
          </div>

          {/* trust strip */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '2rem',
            marginTop: '3rem', animation: 'fadeInUp 0.9s ease-out',
          }}>
            {[
              { icon: <Shield size={16} />, text: 'Verified Drivers' },
              { icon: <MapPin size={16} />, text: 'Real-time Tracking' },
              { icon: <CreditCard size={16} />, text: 'Secure Payments' },
            ].map((item) => (
              <div key={item.text} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 500,
              }}>
                <span style={{ color: '#10B981' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 7. FOOTER ════════════ */}
      <footer style={{ background: '#0F172A', padding: '4rem 1.5rem 2rem', color: '#94A3B8' }}>
        <div style={{ ...container }}>
          <div
            ref={footerCol1.ref}
            className={`tm-reveal tm-stagger-1 ${footerCol1.visible ? 'tm-visible' : ''} tm-footer-grid`}
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
