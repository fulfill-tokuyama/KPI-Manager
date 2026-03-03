import React, { useState, useEffect, FocusEvent } from 'react';
import { KpiData, KPI_LABELS, PRIMARY_KPI_KEYS } from '../lib/types';
import { Save, Trash2, Star } from 'lucide-react';

const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => e.target.select();

const INITIAL_DATA: KpiData = {
  date: new Date().toISOString().split('T')[0],
  leads_meetup: 0,
  workshop_applied: 0,
  workshop_attended_companies: 0,
  diagnosis_done: 0,
  proposals_sent: 0,
  contracts_new: 0,
  mrr: 0,
  churned: 0,
  cases_published: 0,
  referrals: 0,
  leads_from_case: 0,
};

export default function InputPage() {
  const [formData, setFormData] = useState<KpiData>(INITIAL_DATA);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [existingDates, setExistingDates] = useState<string[]>([]);

  useEffect(() => {
    // Fetch existing dates to help user know what's editable
    fetch('/api/kpi')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setExistingDates(res.data.map((d: KpiData) => d.date));
        }
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    
    try {
      const res = await fetch('/api/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setStatus('success');
        // Refresh dates list
        if (!existingDates.includes(formData.date)) {
          setExistingDates([...existingDates, formData.date]);
        }
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('本当にこの日のデータを削除しますか？')) return;
    
    try {
      const res = await fetch('/api/kpi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formData.date }),
      });

      if (res.ok) {
        alert('削除しました');
        setFormData(INITIAL_DATA);
        setExistingDates(existingDates.filter(d => d !== formData.date));
      }
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  const loadDateData = async (date: string) => {
    // In a real app we might fetch specific date, but here we just fetch all and find it
    // or rely on the user typing the date and us checking if it exists.
    // For MVP simplicity: If user selects a date that exists, we should ideally load it.
    // Let's fetch all data again to find the row.
    const res = await fetch('/api/kpi');
    const json = await res.json();
    const found = json.data.find((d: KpiData) => d.date === date);
    if (found) {
      setFormData(found);
    } else {
      // Reset to zeros if new date, but keep the date
      setFormData({ ...INITIAL_DATA, date });
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">データ入力・編集</h2>
        <span className="text-xs text-gray-500">日付を選択すると既存データを読み込みます</span>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={(e) => {
              handleChange(e);
              loadDateData(e.target.value);
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
          {existingDates.includes(formData.date) && (
            <p className="mt-1 text-xs text-amber-600">※ 既存データがあります（上書き保存されます）</p>
          )}
        </div>

        {/* Primary KPI Fields */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-gray-900">重要KPI</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-indigo-50/60 border border-indigo-200">
            {PRIMARY_KPI_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-indigo-700 mb-1">{KPI_LABELS[key]}</label>
                <input
                  type="number"
                  name={key}
                  value={(formData as any)[key]}
                  onChange={handleChange}
                  onFocus={selectOnFocus}
                  min="0"
                  className="block w-full rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Other KPI Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.entries(KPI_LABELS)
            .filter(([key]) => !PRIMARY_KPI_KEYS.includes(key as any))
            .map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="number"
                name={key}
                value={(formData as any)[key]}
                onChange={handleChange}
                onFocus={selectOnFocus}
                min="0"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-6">
          {existingDates.includes(formData.date) && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              削除
            </button>
          )}
          
          <div className="flex-1 flex justify-end">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {status === 'saving' ? '保存中...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </button>
          </div>
        </div>

        {status === 'success' && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800">保存しました</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-800">保存に失敗しました。もう一度お試しください。</p>
          </div>
        )}
      </form>
    </div>
  );
}
