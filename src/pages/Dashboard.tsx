import React, { useEffect, useState } from 'react';
import { calculateMetrics, filterDataByRange, KpiMetrics } from '../lib/kpi';
import { KpiData, ROUTE_LABELS } from '../lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Star } from 'lucide-react';

interface Analytics {
  total: number;
  diagnosed_count: number;
  proposed_count: number;
  quoted_count: number;
  won_count: number;
  case_published_count: number;
  lost_count: number;
  on_hold_count: number;
  by_route: { dispatch: number; training: number; aio: number };
  by_source: { meetup: number; sns: number; referral: number; other: number };
}

const PRIMARY_KPI_COLORS = [
  { bg: 'from-indigo-600 to-indigo-500', ring: 'ring-indigo-400/30' },
  { bg: 'from-violet-600 to-violet-500', ring: 'ring-violet-400/30' },
  { bg: 'from-blue-600 to-blue-500', ring: 'ring-blue-400/30' },
  { bg: 'from-emerald-600 to-emerald-500', ring: 'ring-emerald-400/30' },
];

const ROUTE_PIE_COLORS = ['#4f46e5', '#7c3aed', '#059669'];

export default function Dashboard() {
  const [data, setData] = useState<KpiData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [range, setRange] = useState<'current_month' | 'last_month' | 'last_90_days' | 'all'>('current_month');
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/kpi').then(r => r.json()),
      fetch('/api/analytics').then(r => r.json()),
    ])
      .then(([kpiRes, analyticsRes]) => {
        setData(kpiRes.data || []);
        setAnalytics(analyticsRes.data || null);
        setIsMock(kpiRes.isMock);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredData = filterDataByRange(data, range);
  const metrics = calculateMetrics(filteredData);

  const diagCounts = analytics ? {
    diagnosed: analytics.diagnosed_count,
    proposed: analytics.proposed_count,
    won: analytics.won_count,
    case_published: analytics.case_published_count,
  } : null;

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

      {/* Primary KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">重要KPI</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PrimaryKpiCard label="月間経営者接点数" value={metrics.total_leads_meetup} unit="件" colorIndex={0} />
          <PrimaryKpiCard
            label="月間診断実施数"
            value={diagCounts ? diagCounts.diagnosed : metrics.total_diagnosis_done}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={1}
          />
          <PrimaryKpiCard
            label="月間新規契約数"
            value={diagCounts ? diagCounts.won : metrics.total_contracts_new}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={2}
          />
          <PrimaryKpiCard
            label="月間事例公開数"
            value={diagCounts ? diagCounts.case_published : metrics.total_cases_published}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={3}
          />
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">その他の指標</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="勉強会申込率" value={(metrics.workshop_application_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="勉強会参加企業数" value={metrics.total_workshop_attended} unit="社" />
          <KpiCard label="AI診断移行率" value={(metrics.diagnosis_conversion_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="バックエンド契約率" value={(metrics.contract_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="月間MRR増分" value={metrics.total_mrr.toLocaleString()} unit="円" />
          <KpiCard label="平均単価" value={Math.round(metrics.average_unit_price).toLocaleString()} unit="円" />
          <KpiCard label="継続率" value={(metrics.retention_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="紹介発生数" value={metrics.total_referrals} unit="件" />
        </div>
      </div>

      {/* Charts Row 1: Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">コンバージョンファネル</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: '交流会接点', value: metrics.total_leads_meetup },
                  { name: '勉強会申込', value: metrics.total_workshop_attended },
                  { name: 'AI診断', value: diagCounts?.diagnosed ?? metrics.total_diagnosis_done },
                  { name: '契約', value: diagCounts?.won ?? metrics.total_contracts_new },
                  { name: '事例化', value: diagCounts?.case_published ?? metrics.total_cases_published },
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
                <Line type="monotone" dataKey="leads_meetup" name="接点数" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="diagnosis_done" name="診断数" stroke="#7c3aed" strokeWidth={2} />
                <Line type="monotone" dataKey="contracts_new" name="契約数" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="cases_published" name="事例数" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Route Breakdown + Pipeline (from diagnosis data) */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Route Pie */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">ルート別件数</h3>
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: ROUTE_LABELS.dispatch, value: analytics.by_route.dispatch },
                      { name: ROUTE_LABELS.training, value: analytics.by_route.training },
                      { name: ROUTE_LABELS.aio, value: analytics.by_route.aio },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                  >
                    {ROUTE_PIE_COLORS.map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">案件パイプライン</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: '診断完了', value: analytics.diagnosed_count },
                    { name: '提案済', value: analytics.proposed_count },
                    { name: '見積済', value: analytics.quoted_count },
                    { name: '契約', value: analytics.won_count },
                    { name: '事例公開', value: analytics.case_published_count },
                    { name: '失注', value: analytics.lost_count },
                    { name: '保留', value: analytics.on_hold_count },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                    {[
                      '#38bdf8', '#818cf8', '#a78bfa', '#34d399',
                      '#22c55e', '#f87171', '#94a3b8',
                    ].map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryKpiCard({ label, value, unit, colorIndex, sub }: { label: string; value: string | number; unit: string; colorIndex: number; sub?: string }) {
  const color = PRIMARY_KPI_COLORS[colorIndex];
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${color.bg} p-6 shadow-lg ring-1 ${color.ring}`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-20 w-20 rounded-full bg-white/5" />
      <dt className="text-sm font-medium text-white/80">{label}</dt>
      <dd className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm font-medium text-white/70">{unit}</span>
      </dd>
      {sub && <p className="mt-1 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function KpiCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
      <dt className="text-sm font-medium truncate text-gray-500">{label}</dt>
      <dd className="mt-2 flex items-baseline">
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
        <span className="ml-2 text-sm font-medium text-gray-500">{unit}</span>
      </dd>
    </div>
  );
}
