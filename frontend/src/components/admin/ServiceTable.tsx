// ServiceTable component with bulk selection and cashback editing
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

// Plan definition
interface Plan {
  id: string;
  name: string;
  variation_code: string;
  price: number;
  service: string;
  mode?: 'sandbox' | 'live';
  apiType?: string;
  cashbackType?: 'fixed' | 'percentage';
  cashbackValue?: number;
}

// Props for the component
type Props = {
  plans: Plan[];
  loading: boolean;
  onPlanUpdate: (id: string, updates: Partial<Plan>) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Plan>) => void;
  onPlanDelete: (id: string) => void;
};

const ServiceTable: React.FC<Props> = ({ plans, loading, onPlanUpdate, onBulkUpdate, onPlanDelete }) => {
  // Editing state for a single row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  const [tempCashbackType, setTempCashbackType] = useState<'fixed' | 'percentage'>('fixed');
  const [tempCashbackValue, setTempCashbackValue] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCashbackType, setBulkCashbackType] = useState<'fixed' | 'percentage'>('fixed');
  const [bulkCashbackValue, setBulkCashbackValue] = useState('');

  // Row editing helpers
  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setTempPrice(plan.price.toString());
    setTempCashbackType(plan.cashbackType ?? 'fixed');
    setTempCashbackValue((plan.cashbackValue ?? 0).toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTempPrice('');
    setTempCashbackType('fixed');
    setTempCashbackValue('');
  };

  const saveEdit = (id: string) => {
    const priceNum = Number(tempPrice);
    const cbNum = Number(tempCashbackValue);
    if (!isNaN(priceNum) && !isNaN(cbNum)) {
      const updates: Partial<Plan> = {
        price: priceNum,
        cashbackType: tempCashbackType,
        cashbackValue: cbNum,
      };
      onPlanUpdate(id, updates);
    }
    cancelEdit();
  };

  // Bulk selection helpers
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(plans.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkApply = () => {
    const cbNum = Number(bulkCashbackValue);
    if (selectedIds.size > 0 && !isNaN(cbNum)) {
      const updates: Partial<Plan> = {
        cashbackType: bulkCashbackType,
        cashbackValue: cbNum,
      };
      onBulkUpdate(Array.from(selectedIds), updates);
      setSelectedIds(new Set());
      setBulkCashbackValue('');
    }
  };

  if (loading) return <p className="text-gray-600">Loading plans…</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk actions bar */}
      <div className="bg-gray-50 p-2 rounded flex items-center gap-4 shadow-sm border border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          Bulk actions ({selectedIds.size} selected)
        </span>
        <select
          value={bulkCashbackType}
          onChange={e => setBulkCashbackType(e.target.value as 'fixed' | 'percentage')}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="fixed">Fixed (₦)</option>
          <option value="percentage">Percentage (%)</option>
        </select>
        <input
          type="number"
          placeholder="Value"
          value={bulkCashbackValue}
          onChange={e => setBulkCashbackValue(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-20"
        />
        <button
          onClick={handleBulkApply}
          disabled={selectedIds.size === 0}
          className="bg-primary text-white px-3 py-1 text-sm rounded disabled:opacity-50 hover:bg-primary/90"
        >
          Apply to selected
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow border">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2">
                <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size === plans.length && plans.length > 0} />
              </th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Price (₦)</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Mode</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">API Type</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Cashback</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                  No plans found.
                </td>
              </tr>
            ) : (
              plans.map(plan => {
                const isSelected = selectedIds.has(plan.id);
                return (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(plan.id)} />
                    </td>
                    <td className="px-4 py-2">{plan.name}</td>
                    <td className="px-4 py-2 font-mono text-sm text-gray-600">{plan.variation_code}</td>
                    <td className="px-4 py-2">
                      {editingId === plan.id ? (
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={e => setTempPrice(e.target.value)}
                          className="border rounded px-2 py-1 w-24"
                        />
                      ) : (
                        <span>{plan.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.mode === 'live' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {plan.mode === 'live' ? 'Live' : 'Sandbox'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 capitalize">
                      {plan.apiType || 'vtpass'}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === plan.id ? (
                        <>
                          <select
                            value={tempCashbackType}
                            onChange={e => setTempCashbackType(e.target.value as 'fixed' | 'percentage')}
                            className="border rounded mr-2 p-1"
                          >
                            <option value="fixed">Fixed</option>
                            <option value="percentage">Percentage</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Value"
                            value={tempCashbackValue}
                            onChange={e => setTempCashbackValue(e.target.value)}
                            className="border rounded w-16 p-1"
                          />
                        </>
                      ) : (
                        <span>{plan.cashbackType ? `${plan.cashbackType} ${plan.cashbackValue}` : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 flex space-x-2">
                      {editingId === plan.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(plan.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(plan)}
                            className="p-1 text-primary hover:bg-primary/10 rounded"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this plan?')) {
                                onPlanDelete(plan.id);
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceTable;
