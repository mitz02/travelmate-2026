import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LocationAutocomplete } from '../components/ui/LocationAutocomplete';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  MapPin, Clock, Car, Wifi, Music, PawPrint,
  Wind, ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  ChevronRight
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface LocVal { placeName: string; lng: number; lat: number }

const STEPS = [
  { id: 1, label: 'Route & Time', icon: MapPin },
  { id: 2, label: 'Vehicle Info', icon: Car },
  { id: 3, label: 'Amenities', icon: Wind },
];

/* ─── Style helpers ──────────────────────────────────────── */
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: '20px',
  padding: '32px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  ...extra,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid #D1D5DB',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  background: '#FAFAFA',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '8px',
};

/* ─── Amenity Toggle Button ──────────────────────────────── */
const AmenityBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label: lbl, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      padding: '20px 16px',
      borderRadius: '16px',
      border: `2px solid ${active ? '#4F46E5' : '#E5E7EB'}`,
      background: active ? '#EEF2FF' : '#FAFAFA',
      cursor: 'pointer',
      transition: 'all 0.2s',
      flex: 1,
      minWidth: '90px',
      color: active ? '#4F46E5' : '#9CA3AF',
    }}
  >
    <span style={{ color: active ? '#4F46E5' : '#9CA3AF', transition: 'color 0.2s' }}>{icon}</span>
    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: active ? '#4F46E5' : '#6B7280' }}>{lbl}</span>
    {active && (
      <span style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <CheckCircle2 size={12} color="#fff" />
      </span>
    )}
  </button>
);

/* ─── Step Indicator ─────────────────────────────────────── */
const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '40px' }}>
    {STEPS.map((s, idx) => {
      const done = current > s.id;
      const active = current === s.id;
      const Icon = s.icon;
      return (
        <React.Fragment key={s.id}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: done ? '#10B981' : active ? '#4F46E5' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: done || active ? '#fff' : '#9CA3AF',
              transition: 'all 0.3s',
              boxShadow: active ? '0 0 0 6px rgba(79,70,229,0.15)' : 'none',
              fontWeight: 700, fontSize: '0.85rem',
            }}>
              {done ? <CheckCircle2 size={20} /> : <Icon size={18} />}
            </div>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: active ? '#4F46E5' : done ? '#10B981' : '#9CA3AF',
            }}>{s.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{
              height: '2px', flex: 2, marginBottom: '24px',
              background: current > s.id
                ? 'linear-gradient(90deg,#10B981,#4F46E5)'
                : '#E5E7EB',
              transition: 'background 0.4s',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Main Page ──────────────────────────────────────────── */
export const CreateRidePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1 – Route & Time
  const [fromLoc, setFromLoc] = useState<LocVal | null>(null);
  const [toLoc, setToLoc] = useState<LocVal | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('');
  const [pickupPoints, setPickupPoints] = useState('');
  const [dropoffPoints, setDropoffPoints] = useState('');

  // Step 2 – Vehicle
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 – Amenities
  const [ac, setAc] = useState(false);
  const [music, setMusic] = useState(false);
  const [pet, setPet] = useState(false);
  const [smoking, setSmoking] = useState(false);

  const validateStep1 = () => {
    if (!fromLoc) { setError('Please select a pickup location from the suggestions.'); return false; }
    if (!toLoc) { setError('Please select a destination from the suggestions.'); return false; }
    if (!date) { setError('Please pick a departure date.'); return false; }
    if (!time) { setError('Please pick a departure time.'); return false; }
    if (!price || Number(price) < 100) { setError('Price per seat must be at least ₦100.'); return false; }
    return true;
  };

  const next = () => {
    setError('');
    if (step === 1 && !validateStep1()) return;
    setStep(s => Math.min(3, s + 1));
  };
  const back = () => { setError(''); setStep(s => Math.max(1, s - 1)); };

  const handleSubmit = async () => {
    setError('');
    if (user?.kycStatus !== 'verified') {
      setError('Your account must be fully verified before you can create rides. Please complete KYC verification first.');
      return;
    }
    setLoading(true);
    try {
      const departureTime = new Date(`${date}T${time}`).toISOString();
      await api.post('/rides', {
        from: fromLoc!.placeName,
        to: toLoc!.placeName,
        fromLat: fromLoc!.lat,
        fromLng: fromLoc!.lng,
        toLat: toLoc!.lat,
        toLng: toLoc!.lng,
        departureTime,
        pricePerSeat: Number(price),
        availableSeats: seats,
        totalSeats: seats,
        description: description || `Ride from ${fromLoc!.placeName} to ${toLoc!.placeName}`,
        vehicleMake: make || undefined,
        vehicleModel: model || undefined,
        vehicleColor: color || undefined,
        ac: ac || undefined,
        music: music || undefined,
        pets: pet || undefined,
        smoking: smoking || undefined,
        pickupPoints: pickupPoints || undefined,
        dropoffPoints: dropoffPoints || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/driver/routes'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── SUCCESS screen ─────────────────────────────── */
  if (success) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(16,185,129,0.4)' }}>
            <CheckCircle2 size={40} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>Ride Published!</h2>
          <p style={{ color: '#6B7280', margin: 0, maxWidth: '360px', lineHeight: 1.6 }}>
            Your ride from <strong>{fromLoc?.placeName}</strong> to <strong>{toLoc?.placeName}</strong> is live. Riders can now book seats.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Redirecting to My Routes…</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ── COLOR swatches ─────────────────────────────── */
  const COLOR_OPTIONS = [
    { label: 'White', hex: '#FFFFFF' },
    { label: 'Black', hex: '#111827' },
    { label: 'Silver', hex: '#9CA3AF' },
    { label: 'Red', hex: '#EF4444' },
    { label: 'Blue', hex: '#3B82F6' },
    { label: 'Gray', hex: '#6B7280' },
    { label: 'Gold', hex: '#F59E0B' },
    { label: 'Green', hex: '#10B981' },
  ];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 0 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => navigate('/driver/routes')}
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontWeight: 600, fontSize: '0.875rem' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Create New Ride</h1>
            <p style={{ margin: '2px 0 0', color: '#6B7280', fontSize: '0.9rem' }}>Fill in the details to publish your route</p>
          </div>
        </div>

        {/* Step Bar */}
        <StepBar current={step} />

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px 18px', color: '#991B1B', fontSize: '0.875rem', marginBottom: '24px', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* ── STEP 1: Route & Time ─────────────────────── */}
        {step === 1 && (
          <div style={card()}>
            <h2 style={{ margin: '0 0 24px', fontSize: '1.15rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} color="#4F46E5" />
              </span>
              Route & Schedule
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative', zIndex: 50 }}>
                <LocationAutocomplete label="Pickup Location" placeholder="e.g. Lagos Island" onLocationSelect={setFromLoc} />
              </div>
              <div style={{ position: 'relative', zIndex: 40 }}>
                <LocationAutocomplete label="Destination" placeholder="e.g. Ibadan" onLocationSelect={setToLoc} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Departure Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Departure Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Available Seats</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={() => setSeats(s => Math.max(1, s - 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>−</button>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', minWidth: '24px', textAlign: 'center' }}>{seats}</span>
                    <button type="button" onClick={() => setSeats(s => Math.min(10, s + 1))}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Price per Seat (₦)</label>
                  <input type="number" min={100} placeholder="e.g. 5000" value={price} onChange={e => setPrice(e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Pickup Points (comma separated)</label>
                  <input type="text" placeholder="e.g. Utako, Market, Abuja" value={pickupPoints} onChange={e => setPickupPoints(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Dropoff Points (comma separated)</label>
                  <input type="text" placeholder="e.g. City Center, Mall" value={dropoffPoints} onChange={e => setDropoffPoints(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Vehicle Info ──────────────────────── */}
        {step === 2 && (
          <div style={card()}>
            <h2 style={{ margin: '0 0 24px', fontSize: '1.15rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={16} color="#D97706" />
              </span>
              Vehicle Information
            </h2>
            <p style={{ margin: '-8px 0 24px', fontSize: '0.875rem', color: '#9CA3AF' }}>Riders feel more comfortable knowing what car to look out for.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Car Make</label>
                  <input placeholder="e.g. Toyota, Honda, Hyundai" value={make} onChange={e => setMake(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Car Model</label>
                  <input placeholder="e.g. Camry, Civic, Elantra" value={model} onChange={e => setModel(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={label}>Vehicle Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.label}
                      type="button"
                      title={c.label}
                      onClick={() => setColor(c.label)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: c.hex,
                        border: color === c.label ? '3px solid #4F46E5' : '2px solid #E5E7EB',
                        cursor: 'pointer',
                        boxShadow: color === c.label ? '0 0 0 3px rgba(79,70,229,0.25)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
                {color && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>Selected: <strong>{color}</strong></p>
                )}
              </div>

              <div>
                <label style={label}>Driver's Note <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
                <textarea
                  placeholder="e.g. I play calm music. No smoking inside the car."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Amenities & Preferences ──────────── */}
        {step === 3 && (
          <div style={card()}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wind size={16} color="#10B981" />
              </span>
              Amenities & Preferences
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: '0.875rem', color: '#9CA3AF' }}>Let riders know what to expect on the trip.</p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <AmenityBtn icon={<Wind size={28} />} label="Air Conditioning" active={ac} onClick={() => setAc(v => !v)} />
              <AmenityBtn icon={<Music size={28} />} label="Music" active={music} onClick={() => setMusic(v => !v)} />
              <AmenityBtn icon={<PawPrint size={28} />} label="Pets Allowed" active={pet} onClick={() => setPet(v => !v)} />
              <AmenityBtn icon={<Wind size={28} />} label="Smoking" active={smoking} onClick={() => setSmoking(v => !v)} />
            </div>

            {/* Summary */}
            <div style={{ marginTop: '32px', background: '#F9FAFB', borderRadius: '14px', padding: '20px', border: '1px solid #E5E7EB' }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ride Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Route', value: `${fromLoc?.placeName} → ${toLoc?.placeName}` },
                  { label: 'Departure', value: date && time ? `${new Date(`${date}T${time}`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })} at ${time}` : '—' },
                  { label: 'Seats', value: seats },
                  { label: 'Price/Seat', value: price ? `₦${Number(price).toLocaleString()}` : '—' },
                  { label: 'Vehicle', value: [make, model, color].filter(Boolean).join(' · ') || '—' },
                  { label: 'Amenities', value: [ac && 'AC', music && 'Music', pet && 'Pets OK', smoking && 'Smoking'].filter(Boolean).join(', ') || 'None' },
                ].map(({ label: lbl, value }) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500, flexShrink: 0 }}>{lbl}</span>
                    <span style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={step === 1 ? () => navigate('/driver/routes') : back}
            style={{
              padding: '14px 28px', borderRadius: '12px', border: '1px solid #E5E7EB',
              background: '#fff', color: '#374151', fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={17} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              style={{
                padding: '14px 32px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 20px rgba(79,70,229,0.4)', transition: 'all 0.2s',
              }}
            >
              Next <ArrowRight size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '14px 32px', borderRadius: '12px', border: 'none',
                background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#10B981,#059669)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? <><Loader2 size={17} className="animate-spin" /> Publishing…</> : <><CheckCircle2 size={17} /> Publish Ride</>}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
