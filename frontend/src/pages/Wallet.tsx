import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WithdrawModal } from '../components/wallet/WithdrawModal';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' },
  card: {
    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
    padding: '24px', display: 'flex', flexDirection: 'column' as const,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' as const, overflow: 'hidden',
  },
  cardHeader: { padding: '24px', borderBottom: '1px solid var(--border-color)', fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' },
  kpiTop: { display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 },
  iconWrapper: (bg: string, color: string) => ({ padding: '12px', borderRadius: '12px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  kpiTitle: { fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', margin: 0 },
  kpiValue: { fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' },
  kpiBottom: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 },
  bgIcon: (color: string) => ({ position: 'absolute' as const, top: '-10px', right: '-10px', color, opacity: 0.05, transform: 'scale(1.5)', zIndex: 0 }),
  buttonPrimary: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: '#4F46E5', color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)', transition: 'transform 0.2s',
  },
  buttonSecondary: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: '#fff', color: '#374151',
    border: '1px solid #E5E7EB', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
  th: { padding: '16px 24px', backgroundColor: 'var(--card-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' as const, fontWeight: 600 },
  td: { padding: '16px 24px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.875rem' },
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

export const Wallet: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.get('/wallet/me'),
        api.get('/wallet/me/transactions'),
      ]);
      setBalance(walletRes.data.balance || 0);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      console.error('Failed to load wallet data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <DashboardLayout isAdmin={user?.role === 'admin'}>
      <div style={styles.container}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>My Wallet</h2>

        <div style={styles.kpiGrid}>
          <div style={styles.card}>
            <div style={styles.bgIcon('#10B981')}><WalletIcon size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(16, 185, 129, 0.1)', '#10B981')}><WalletIcon size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Wallet Balance</p>
                <h3 style={styles.kpiValue}>₦{balance.toLocaleString()}</h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <button onClick={() => setIsWithdrawModalOpen(true)} style={styles.buttonPrimary}>
                <ArrowUpRight size={18} /> Withdraw Funds
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, padding: 0 }}>
          <h3 style={{ ...styles.cardHeader, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--text-muted)" />
            Transaction History
          </h3>
          <div style={{ overflowX: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No transactions yet. Your earnings will appear here.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={styles.td}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: tx.type === 'credit' ? '#ECFDF5' : '#FEF2F2',
                            color: tx.type === 'credit' ? '#059669' : '#DC2626',
                          }}>
                            {tx.type === 'credit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{tx.type}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{tx.description || '—'}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: tx.type === 'credit' ? '#059669' : '#DC2626' }}>
                        {tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                      </td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(tx.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: tx.status === 'completed' ? '#ECFDF5' : tx.status === 'pending' ? '#FEF3C7' : '#FEF2F2',
                          color: tx.status === 'completed' ? '#059669' : tx.status === 'pending' ? '#D97706' : '#DC2626',
                        }}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={() => { setIsWithdrawModalOpen(false); fetchWallet(); }}
      />
    </DashboardLayout>
  );
};
