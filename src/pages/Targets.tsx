import React, { useEffect, useState, FocusEvent } from 'react';
import { KpiTarget, TARGET_KPI_LABELS } from '../lib/types';
import { Save, Target, ChevronLeft, ChevronRight } from 'lucide-react';

const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => e.target.select();

const TARGET_KEYS = Object.keys(TARGET_KPI_LABELS) as (keyof typeof TARGET_KPI_LABELS)[];

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return `${y}年${Number(mo)}月`;
}

function shiftMonth(m: string, delta: number): string {
  const d = new Date(`${m}-01`);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default function Targets() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(currentMonth);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [form, setForm] = useState<KpiTarget>({ month, leads_meetup: 0, workshop_attended_companies: 0, diagnosis_done: 0, diagnosis_conversion_rate: 0, contracts_new: 0, cases_published: 0 });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/targets')
      .then(r => r.json())
      .then(res => setTargets(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const existing = targets.find(t => t.month === month);
    if (existing) {
      setForm(existing);
    } else {
      setForm({ month, leads_meetup: 0, workshop_attended_companies: 0, diagnosis_done: 0, diagnosis_conversion_rate: 0, contracts_new: 0, cases_published: 0 });
    }
  }, [month, targets]);

  const handleChange = (key: keyof Omit<KpiTarget, 'month'>, value: string) => {
    setForm(prev => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, month }),
      });
      if (res.ok) {
        const result = await res.json();
        setTargets(prev => {
          const idx = prev.findIndex(t => t.month === month);
          if (idx >= 0) { const copy = [...prev]; copy[idx] = result.data; return copy; }
          return [...prev, result.data];
        });
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const existingMonths = targets.map(t => t.month).sort().reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Target className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">KPI目標設定</h1>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[140px] text-center">{monthLabel(month)}</h2>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Target Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TARGET_KEYS.map(key => (
            <div key={key} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">{TARGET_KPI_LABELS[key]}</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  onFocus={selectOnFocus}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">目標</span>
              </div>
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {status === 'success' && <span className="text-sm text-green-600 font-medium">保存しました</span>}
            {status === 'error' && <span className="text-sm text-red-600 font-medium">保存に失敗しました</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {saving ? '保存中...' : <><Save className="w-4 h-4 mr-2" />保存</>}
          </button>
        </div>
      </div>

      {/* Existing Targets Overview */}
      {existingMonths.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">設定済み月次目標</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">月</th>
                  {TARGET_KEYS.map(k => (
                    <th key={k} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{TARGET_KPI_LABELS[k]}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {existingMonths.map(m => {
                  const t = targets.find(t => t.month === m)!;
                  return (
                    <tr key={m} className={`hover:bg-gray-50 ${m === month ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{monthLabel(m)}</td>
                      {TARGET_KEYS.map(k => (
                        <td key={k} className="px-4 py-3 text-sm text-right text-gray-700">{t[k]}</td>
                      ))}
                      <td className="px-4 py-3">
                        <button onClick={() => setMonth(m)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                          編集
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
