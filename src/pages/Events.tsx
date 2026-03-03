import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { EventRecord, EventsAnalytics } from '../lib/types';

type PeriodFilter = 'current_month' | 'last_month' | 'last_90_days' | 'all';

function getPeriodRange(period: PeriodFilter): { from?: string; to?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'current_month': {
      const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const to = new Date(y, m + 1, 0).toISOString().split('T')[0];
      return { from, to };
    }
    case 'last_month': {
      const from = `${m === 0 ? y - 1 : y}-${String(m === 0 ? 12 : m).padStart(2, '0')}-01`;
      const to = new Date(y, m, 0).toISOString().split('T')[0];
      return { from, to };
    }
    case 'last_90_days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { from: d.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
    default:
      return {};
  }
}

function formatYen(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString() + '円';
}

function calcCpc(cost: number, contacts: number): number | null {
  return contacts > 0 ? Math.round(cost / contacts) : null;
}

function calcCpa(cost: number, appointments: number): number | null {
  return appointments > 0 ? Math.round(cost / appointments) : null;
}

const EMPTY_FORM = {
  event_date: new Date().toISOString().split('T')[0],
  event_name: '',
  cost_yen: '',
  contacts_count: '',
  appointments_count: '',
  notes: '',
};

export default function Events() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const range = getPeriodRange(period);
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      if (search) params.set('q', search);
      const res = await fetch(`/api/events?${params}`);
      const json = await res.json();
      const data = (json.data || []).map((e: any) => ({
        ...e,
        cost_yen: Number(e.cost_yen) || 0,
        contacts_count: Number(e.contacts_count) || 0,
        appointments_count: Number(e.appointments_count) || 0,
      }));
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [period, search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.event_date || !form.event_name || !form.cost_yen) {
      setError('日付、交流会名、費用は必須です');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        event_date: form.event_date,
        event_name: form.event_name,
        cost_yen: Number(form.cost_yen) || 0,
        contacts_count: Number(form.contacts_count) || 0,
        appointments_count: Number(form.appointments_count) || 0,
        notes: form.notes,
      };

      const url = editingId ? `/api/events/${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('保存に失敗しました');
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchEvents();
    } catch (err: any) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ev: EventRecord) => {
    setEditingId(ev.id);
    setForm({
      event_date: ev.event_date,
      event_name: ev.event_name,
      cost_yen: String(ev.cost_yen),
      contacts_count: String(ev.contacts_count),
      appointments_count: String(ev.appointments_count),
      notes: ev.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('このイベントを削除してもよろしいですか？')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      await fetchEvents();
    } catch (err: any) {
      setError(err.message || '削除に失敗しました');
    }
  };

  const handleNewClick = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const summary = computeSummary(events);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">交流会イベント管理</h1>
        <button onClick={handleNewClick} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" />新規登録
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700"><X className="w-4 h-4 inline" /></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="参加回数" value={String(summary.events_count)} unit="回" />
        <SummaryCard label="費用合計" value={summary.cost_sum.toLocaleString()} unit="円" />
        <SummaryCard label="接点合計" value={String(summary.contacts_sum)} unit="人" />
        <SummaryCard label="アポ合計" value={String(summary.appointments_sum)} unit="件" />
        <SummaryCard label="CPC (接点単価)" value={summary.cpc != null ? summary.cpc.toLocaleString() : '-'} unit={summary.cpc != null ? '円' : ''} highlight />
        <SummaryCard label="CPA (アポ単価)" value={summary.cpa != null ? summary.cpa.toLocaleString() : '-'} unit={summary.cpa != null ? '円' : ''} highlight />
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          {(['current_month', 'last_month', 'last_90_days', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setPeriod(r)}
              className={clsx(
                'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors',
                period === r ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {r === 'current_month' && '今月'}
              {r === 'last_month' && '先月'}
              {r === 'last_90_days' && '直近90日'}
              {r === 'all' && '全期間'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="交流会名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{editingId ? 'イベント編集' : '新規イベント登録'}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日付 <span className="text-red-500">*</span></label>
                <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">交流会名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} placeholder="例: AI活用経営者交流会" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">費用（円） <span className="text-red-500">*</span></label>
                <input type="number" min="0" value={form.cost_yen} onChange={(e) => setForm({ ...form, cost_yen: e.target.value })} placeholder="5000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接点数（人） <span className="text-red-500">*</span></label>
                <input type="number" min="0" value={form.contacts_count} onChange={(e) => setForm({ ...form, contacts_count: e.target.value })} placeholder="8" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">アポ数（件）</label>
                <input type="number" min="0" value={form.appointments_count} onChange={(e) => setForm({ ...form, appointments_count: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="備考・気づきなど" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
                {saving ? '保存中...' : editingId ? '更新する' : '登録する'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">交流会名</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">費用</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">接点数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アポ数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メモ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">データがありません</td></tr>
              ) : events.map((ev) => {
                const cpc = calcCpc(ev.cost_yen, ev.contacts_count);
                const cpa = calcCpa(ev.cost_yen, ev.appointments_count);
                return (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{ev.event_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{ev.event_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{ev.cost_yen.toLocaleString()}円</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{ev.contacts_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{ev.appointments_count}</td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap font-medium text-indigo-600">{formatYen(cpc)}</td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap font-medium text-emerald-600">{formatYen(cpa)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">{ev.notes || '-'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => handleEdit(ev)} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(ev.id)} className="text-gray-400 hover:text-red-600 p-1 ml-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function computeSummary(events: EventRecord[]): EventsAnalytics {
  const events_count = events.length;
  const cost_sum = events.reduce((s, e) => s + e.cost_yen, 0);
  const contacts_sum = events.reduce((s, e) => s + e.contacts_count, 0);
  const appointments_sum = events.reduce((s, e) => s + e.appointments_count, 0);
  return {
    events_count,
    cost_sum,
    contacts_sum,
    appointments_sum,
    cpc: contacts_sum > 0 ? Math.round(cost_sum / contacts_sum) : null,
    cpa: appointments_sum > 0 ? Math.round(cost_sum / appointments_sum) : null,
  };
}

function SummaryCard({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={clsx(
      'p-3 rounded-lg border shadow-sm text-center',
      highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
    )}>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className={clsx('text-lg font-bold', highlight ? 'text-indigo-700' : 'text-gray-900')}>
        {value}<span className="text-xs font-medium text-gray-400 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
