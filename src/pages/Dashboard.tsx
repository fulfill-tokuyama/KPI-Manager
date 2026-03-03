import React, { useEffect, useState } from 'react';
import { calculateMetrics, filterDataByRange, KpiMetrics } from '../lib/kpi';
import { KpiData } from '../lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<KpiData[]>([]);
  const [range, setRange] = useState<'current_month' | 'last_month' | 'last_90_days' | 'all'>('current_month');
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    fetch('/api/kpi')
      .then(res => res.json())
      .then(res => {
        setData(res.data);
        setIsMock(res.isMock);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredData = filterDataByRange(data, range);
  const metrics = calculateMetrics(filteredData);

  // Helper for comparison (simplified: compare with previous period of same length would be ideal, 
  // but for MVP just showing current value is fine, or simple hardcoded comparison if needed)
  // We will just display the values for now.

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      {isMock && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <span className="font-bold">Demo Mode:</span> Google Sheets credentials not found. Showing mock data. 
                Configure <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, <code>GOOGLE_PRIVATE_KEY</code>, and <code>GOOGLE_SHEET_ID</code> to persist data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          {(['current_month', 'last_month', 'last_90_days', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                range === r ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {r === 'current_month' && '今月'}
              {r === 'last_month' && '先月'}
              {r === 'last_90_days' && '直近90日'}
              {r === 'all' && '全期間'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="月間経営者接点数" value={metrics.total_leads_meetup} unit="件" />
        <KpiCard label="勉強会申込率" value={(metrics.workshop_application_rate * 100).toFixed(1)} unit="%" />
        <KpiCard label="勉強会参加企業数" value={metrics.total_workshop_attended} unit="社" />
        <KpiCard label="AI診断移行率" value={(metrics.diagnosis_conversion_rate * 100).toFixed(1)} unit="%" />
        
        <KpiCard label="AI診断実施数" value={metrics.total_diagnosis_done} unit="件" />
        <KpiCard label="バックエンド契約率" value={(metrics.contract_rate * 100).toFixed(1)} unit="%" />
        <KpiCard label="新規契約数" value={metrics.total_contracts_new} unit="件" highlight />
        <KpiCard label="月間MRR増分" value={metrics.total_mrr.toLocaleString()} unit="円" highlight />

        <KpiCard label="平均単価" value={Math.round(metrics.average_unit_price).toLocaleString()} unit="円" />
        <KpiCard label="継続率" value={(metrics.retention_rate * 100).toFixed(1)} unit="%" />
        <KpiCard label="事例公開数" value={metrics.total_cases_published} unit="件" />
        <KpiCard label="紹介発生数" value={metrics.total_referrals} unit="件" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Funnel Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">コンバージョンファネル</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: '交流会接点', value: metrics.total_leads_meetup },
                  { name: '勉強会申込', value: metrics.total_workshop_attended }, // Using attended as proxy for funnel step usually
                  { name: 'AI診断', value: metrics.total_diagnosis_done },
                  { name: '契約', value: metrics.total_contracts_new },
                  { name: '事例化', value: metrics.total_cases_published },
                ]}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">週次推移</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip labelFormatter={(str) => new Date(str).toLocaleDateString()} />
                <Legend />
                <Line type="monotone" dataKey="leads_meetup" name="接点数" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="diagnosis_done" name="診断数" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="contracts_new" name="契約数" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, highlight = false }: { label: string, value: string | number, unit: string, highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-200'} shadow-sm`}>
      <dt className={`text-sm font-medium truncate ${highlight ? 'text-indigo-600' : 'text-gray-500'}`}>
        {label}
      </dt>
      <dd className="mt-2 flex items-baseline">
        <span className={`text-2xl font-semibold ${highlight ? 'text-indigo-900' : 'text-gray-900'}`}>
          {value}
        </span>
        <span className={`ml-2 text-sm font-medium ${highlight ? 'text-indigo-600' : 'text-gray-500'}`}>
          {unit}
        </span>
      </dd>
    </div>
  );
}
