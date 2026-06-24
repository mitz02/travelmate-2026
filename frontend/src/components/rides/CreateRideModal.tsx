import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LocationAutocomplete } from '../ui/LocationAutocomplete';

const styles = {
  overlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    padding: '20px'
  },
  modal: {
    background: '#fff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' as const
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, fontSize: '1.25rem', color: '#111827', fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', 
    boxSizing: 'border-box' as const, fontSize: '0.95rem', transition: 'border-color 0.2s',
    outline: 'none'
  },
  row: { display: 'flex', gap: '16px', marginBottom: '16px' },
  col: { flex: 1 },
  checkboxRow: {
    display: 'flex', gap: '16px', flexWrap: 'wrap' as const, marginBottom: '16px'
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer'
  },
  buttonPrimary: {
    width: '100%', padding: '14px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', 
    borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)', transition: 'all 0.2s'
  },
  alertError: {
    backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', 
    marginBottom: '16px', fontSize: '0.875rem', border: '1px solid #FECACA'
  },
  successContainer: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', padding: '40px 20px', textAlign: 'center' as const, gap: '16px'
  },
  successIcon: {
    width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFDF5',
    color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  sectionTitle: {
    fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: '12px', marginTop: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '16px'
  }
};

interface CreateRideModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRideModal: React.FC<CreateRideModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [fromLoc, setFromLoc] = useState<{ placeName: string; lng: number; lat: number } | null>(null);
  const [toLoc, setToLoc] = useState<{ placeName: string; lng: number; lat: number } | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState(4);
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [ac, setAc] = useState(false);
  const [music, setMusic] = useState(false);
  const [pets, setPets] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [pickupPoints, setPickupPoints] = useState('');
  const [dropoffPoints, setDropoffPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.kycStatus !== 'verified') {
      setError('Your account must be fully verified before you can create rides. Please complete KYC verification first.');
      return;
    }
    
    if (!fromLoc || !toLoc) {
      setError('Please select both pickup and dropoff locations from the dropdown.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const departureTime = new Date(`${date}T${time}`).toISOString();
      const payload: Record<string, unknown> = {
        from: fromLoc.placeName,
        to: toLoc.placeName,
        fromLat: fromLoc.lat,
        fromLng: fromLoc.lng,
        toLat: toLoc.lat,
        toLng: toLoc.lng,
        departureTime,
        pricePerSeat: Number(pricePerSeat),
        availableSeats: Number(availableSeats),
        totalSeats: Number(availableSeats),
        description: description || `Ride from ${fromLoc.placeName} to ${toLoc.placeName}`,
        vehicleMake: vehicleMake || undefined,
        vehicleModel: vehicleModel || undefined,
        vehicleColor: vehicleColor || undefined,
        ac: ac || undefined,
        music: music || undefined,
        pets: pets || undefined,
        smoking: smoking || undefined,
        pickupPoints: pickupPoints || undefined,
        dropoffPoints: dropoffPoints || undefined,
      };

      await api.post('/rides', payload);
      setSuccess(true);

      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create ride. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>{success ? 'Ride Published!' : 'Create New Ride'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} /></button>
        </div>

        {success ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              Route Created Successfully!
            </h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>
              Your ride from <strong>{fromLoc?.placeName}</strong> to <strong>{toLoc?.placeName}</strong> is now live. Riders can start booking seats.
            </p>
          </div>
        ) : (
          <>
            {error && <div style={styles.alertError}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup} className="relative z-50">
                <LocationAutocomplete 
                  label="From (Origin)" 
                  placeholder="e.g. Lagos" 
                  onLocationSelect={setFromLoc} 
                />
              </div>
              
              <div style={styles.formGroup} className="relative z-40">
                <LocationAutocomplete 
                  label="To (Destination)" 
                  placeholder="e.g. Ibadan" 
                  onLocationSelect={setToLoc} 
                />
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={styles.input} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} required style={styles.input} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Available Seats</label>
                  <input type="number" min="1" max="10" value={availableSeats} onChange={e => setAvailableSeats(Number(e.target.value))} required style={styles.input} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Price per seat (₦)</label>
                  <input type="number" min="100" placeholder="e.g. 5000" value={pricePerSeat} onChange={e => setPricePerSeat(e.target.value)} required style={styles.input} />
                </div>
              </div>

              <div style={styles.sectionTitle}>Vehicle Information</div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Car Make</label>
                  <input type="text" placeholder="e.g. Toyota" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Car Model</label>
                  <input type="text" placeholder="e.g. Sienna" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} style={styles.input} />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Car Color</label>
                <input type="text" placeholder="e.g. Grey" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} style={styles.input} />
              </div>

              <div style={styles.sectionTitle}>Amenities</div>

              <div style={styles.checkboxRow}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={ac} onChange={e => setAc(e.target.checked)} /> AC
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={music} onChange={e => setMusic(e.target.checked)} /> Music
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)} /> Pets
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={smoking} onChange={e => setSmoking(e.target.checked)} /> Smoking
                </label>
              </div>

              <div style={styles.sectionTitle}>Route Stops</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Pickup Points (comma separated)</label>
                <input type="text" placeholder="e.g. Utako, Market, Abuja" value={pickupPoints} onChange={e => setPickupPoints(e.target.value)} style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Dropoff Points (comma separated)</label>
                <input type="text" placeholder="e.g. City Center, Mall" value={dropoffPoints} onChange={e => setDropoffPoints(e.target.value)} style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description (optional)</label>
                <input type="text" placeholder="e.g. Air-conditioned ride" value={description} onChange={e => setDescription(e.target.value)} style={styles.input} />
              </div>
              
              <button type="submit" disabled={loading} style={{ ...styles.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Publishing...' : 'Publish Ride'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
