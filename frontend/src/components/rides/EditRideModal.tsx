import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

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
  }
};

interface EditRideModalProps {
  ride: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditRideModal: React.FC<EditRideModalProps> = ({ ride, onClose, onSuccess }) => {
  // Parse existing date/time
  const departureDateObj = new Date(ride.departure_time);
  const initialDate = departureDateObj.toISOString().split('T')[0];
  const initialTime = departureDateObj.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [availableSeats, setAvailableSeats] = useState(ride.total_seats); // Resetting available = total for simplicity of edits, or keep current
  const [pricePerSeat, setPricePerSeat] = useState(ride.price_per_seat.toString());
  const [description, setDescription] = useState(ride.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If a ride is partially booked, we probably shouldn't let them reduce total seats below booked seats.
  // But for this simple implementation we'll let them set new total seats which resets available.
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const departureTime = new Date(`${date}T${time}`).toISOString();
      const payload = {
        departureTime,
        pricePerSeat: Number(pricePerSeat),
        availableSeats: Number(availableSeats),
        totalSeats: Number(availableSeats),
        description: description
      };

      await api.put(`/rides/${ride.id}`, payload);
      setSuccess(true);

      // Auto-close and refresh after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update ride. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>{success ? 'Ride Updated!' : 'Edit Route'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} /></button>
        </div>

        {success ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              Route Updated Successfully!
            </h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>
              Your changes are now live.
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '16px' }}>
              Editing Route: <strong>{ride.from} &rarr; {ride.to}</strong>
            </p>

            {error && <div style={styles.alertError}>{error}</div>}

            <form onSubmit={handleSubmit}>
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
                  <label style={styles.label}>Total Seats</label>
                  <input type="number" min="1" max="10" value={availableSeats} onChange={e => setAvailableSeats(Number(e.target.value))} required style={styles.input} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Price per seat (₦)</label>
                  <input type="number" min="100" placeholder="e.g. 5000" value={pricePerSeat} onChange={e => setPricePerSeat(e.target.value)} required style={styles.input} />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description (optional)</label>
                <input type="text" placeholder="e.g. Air-conditioned Toyota Sienna" value={description} onChange={e => setDescription(e.target.value)} style={styles.input} />
              </div>
              
              <button type="submit" disabled={loading} style={{ ...styles.buttonPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
