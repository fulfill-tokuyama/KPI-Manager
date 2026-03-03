import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateMetrics, filterDataByRange, KpiMetrics } from '../lib/kpi';
import { KpiData, KpiTarget, TARGET_KPI_LABELS, ROUTE_LABELS } from '../lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Star, Target, Users, Handshake } from 'lucide-react';
import type { EventsAnalytics } from '../lib/types';

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
  events?: EventsAnalytics;
}

const PRIMARY_KPI_COLORS = [
  { bg: 'from-indigo-600 to-indigo-500', ring: 'ring-indigo-400/30' },
  { bg: 'from-cyan-600 to-cyan-500', ring: 'ring-cyan-400/30' },
  { bg: 'from-violet-600 to-violet-500', ring: 'ring-violet-400/30' },
  { bg: 'from-amber-600 to-amber-500', ring: 'ring-amber-400/30' },
  { bg: 'from-blue-600 to-blue-500', ring: 'ring-blue-400/30' },
  { bg: 'from-emerald-600 to-emerald-500', ring: 'ring-emerald-400/30' },
];

const ROUTE_PIE_COLORS = ['#4f46e5', '#7c3aed', '#059669'];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [data, setData] = useState<KpiData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [target, setTarget] = useState<KpiTarget | null>(null);
  const [range, setRange] = useState<'current_month' | 'last_month' | 'last_90_days' | 'all'>('current_month');
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const month = getCurrentMonth();
    Promise.all([
      fetch('/api/kpi').then(r => r.json()),
      fetch('/api/analytics').then(r => r.json()),
      fetch(`/api/targets?month=${month}`).then(r => r.json()),
    ])
      .then(([kpiRes, analyticsRes, targetRes]) => {
        setData(kpiRes.data || []);
        setAnalytics(analyticsRes.data || null);
        const targets = targetRes.data || [];
        setTarget(targets.length > 0 ? targets[0] : null);
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

      {/* Monthly Target Summary */}
      <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-indigo-900">今月の目標値</h2>
          </div>
          <Link to="/targets" className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-full font-medium transition-colors">
            <Target className="w-3 h-3" />
            {target ? '編集' : '設定する'}
          </Link>
        </div>
        {target ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.keys(TARGET_KPI_LABELS) as (keyof typeof TARGET_KPI_LABELS)[]).map(key => (
              <div key={key} className="text-center p-3 rounded-lg bg-white border border-indigo-100 shadow-sm">
                <div className="text-xs font-medium text-indigo-400 mb-1">{TARGET_KPI_LABELS[key]}</div>
                <div className="text-xl font-bold text-indigo-900">
                  {target[key]}<span className="text-sm font-medium text-indigo-400 ml-0.5">{key === 'diagnosis_conversion_rate' ? '%' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-indigo-400">今月の目標が未設定です</p>
            <Link to="/targets" className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <Target className="w-4 h-4" />目標を設定してください
            </Link>
          </div>
        )}
      </div>

      {/* Primary KPIs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">重要KPI実績値</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PrimaryKpiCard label="月間経営者接点数" value={metrics.total_leads_meetup} unit="件" colorIndex={0} target={target?.leads_meetup} />
          <PrimaryKpiCard label="勉強会参加企業数" value={metrics.total_workshop_attended} unit="社" colorIndex={1} target={target?.workshop_attended_companies} />
          <PrimaryKpiCard
            label="月間診断実施数"
            value={diagCounts ? diagCounts.diagnosed : metrics.total_diagnosis_done}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={2} target={target?.diagnosis_done}
          />
          <PrimaryKpiCard
            label="AI診断移行率"
            value={(metrics.diagnosis_conversion_rate * 100).toFixed(1)}
            unit="%" colorIndex={3} target={target?.diagnosis_conversion_rate}
          />
          <PrimaryKpiCard
            label="月間新規契約数"
            value={diagCounts ? diagCounts.won : metrics.total_contracts_new}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={4} target={target?.contracts_new}
          />
          <PrimaryKpiCard
            label="月間事例公開数"
            value={diagCounts ? diagCounts.case_published : metrics.total_cases_published}
            sub={diagCounts ? '案件DB集計' : undefined}
            unit="件" colorIndex={5} target={target?.cases_published}
          />
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">その他の実績値</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="勉強会申込率" value={(metrics.workshop_application_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="バックエンド契約率" value={(metrics.contract_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="月間MRR増分" value={metrics.total_mrr.toLocaleString()} unit="円" />
          <KpiCard label="平均単価" value={Math.round(metrics.average_unit_price).toLocaleString()} unit="円" />
          <KpiCard label="継続率" value={(metrics.retention_rate * 100).toFixed(1)} unit="%" />
          <KpiCard label="紹介発生数" value={metrics.total_referrals} unit="件" />
        </div>
      </div>

      {/* 交流会 ROI */}
      {analytics?.events && (
        <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-emerald-900">交流会ROI</h2>
            </div>
            <Link to="/events" className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-full font-medium transition-colors">
              <Users className="w-3 h-3" />詳細
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="text-center p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
              <div className="text-xs font-medium text-emerald-400 mb-1">参加回数</div>
              <div className="text-xl font-bold text-emerald-900">{analytics.events.events_count}<span className="text-sm font-medium text-emerald-400 ml-0.5">回</span></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
              <div className="text-xs font-medium text-emerald-400 mb-1">費用合計</div>
              <div className="text-xl font-bold text-emerald-900">{analytics.events.cost_sum.toLocaleString()}<span className="text-sm font-medium text-emerald-400 ml-0.5">円</span></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
              <div className="text-xs font-medium text-emerald-400 mb-1">接点合計</div>
              <div className="text-xl font-bold text-emerald-900">{analytics.events.contacts_sum}<span className="text-sm font-medium text-emerald-400 ml-0.5">人</span></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
              <div className="text-xs font-medium text-emerald-400 mb-1">アポ合計</div>
              <div className="text-xl font-bold text-emerald-900">{analytics.events.appointments_sum}<span className="text-sm font-medium text-emerald-400 ml-0.5">件</span></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm">
              <div className="text-xs font-medium text-emerald-500 mb-1">期間CPC</div>
              <div className="text-xl font-bold text-emerald-800">{analytics.events.cpc != null ? analytics.events.cpc.toLocaleString() : '-'}<span className="text-sm font-medium text-emerald-400 ml-0.5">{analytics.events.cpc != null ? '円' : ''}</span></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm">
              <div className="text-xs font-medium text-emerald-500 mb-1">期間CPA</div>
              <div className="text-xl font-bold text-emerald-800">{analytics.events.cpa != null ? analytics.events.cpa.toLocaleString() : '-'}<span className="text-sm font-medium text-emerald-400 ml-0.5">{analytics.events.cpa != null ? '円' : ''}</span></div>
            </div>
          </div>
        </div>
      )}

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

function PrimaryKpiCard({ label, value, unit, colorIndex, sub, target }: { label: string; value: string | number; unit: string; colorIndex: number; sub?: string; target?: number }) {
  const color = PRIMARY_KPI_COLORS[colorIndex];
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const hasTarget = target != null && target > 0;
  const pct = hasTarget ? Math.min(Math.round((numValue / target!) * 100), 999) : null;
  const diff = hasTarget ? numValue - target! : null;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${color.bg} p-6 shadow-lg ring-1 ${color.ring}`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-20 w-20 rounded-full bg-white/5" />
      <dt className="text-sm font-medium text-white/80">{label}</dt>
      <dd className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm font-medium text-white/70">{unit}</span>
        {diff != null && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${diff >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/30 text-red-100'}`}>
            {diff >= 0 ? '+' : ''}{diff}
          </span>
        )}
      </dd>
      {hasTarget && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
            <span>目標 {target}</span>
            <span className={`font-semibold ${pct! >= 100 ? 'text-green-200' : 'text-white/90'}`}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct! >= 100 ? 'bg-green-300' : 'bg-white/60'}`}
              style={{ width: `${Math.min(pct!, 100)}%` }}
            />
          </div>
        </div>
      )}
      {sub && !hasTarget && <p className="mt-1 text-xs text-white/50">{sub}</p>}
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
