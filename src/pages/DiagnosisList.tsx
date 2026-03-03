import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle, ChevronDown } from 'lucide-react';
import {
  Diagnosis, DiagnosisStatus, DiagnosisRoute, DiagnosisSource,
  DIAGNOSIS_STATUSES, DIAGNOSIS_ROUTES, DIAGNOSIS_SOURCES,
  STATUS_LABELS, STATUS_COLORS, ROUTE_LABELS, SOURCE_LABELS,
} from '../lib/types';

function parseRow(raw: any): Diagnosis {
  return {
    ...raw,
    pains: typeof raw.pains === 'string' ? tryParseJson(raw.pains) : raw.pains || [],
    initiatives: typeof raw.initiatives === 'string' ? tryParseJson(raw.initiatives) : raw.initiatives || [],
    links: typeof raw.links === 'string' ? tryParseJson(raw.links) : raw.links || [],
  };
}

function tryParseJson(str: string): string[] {
  try { return JSON.parse(str); } catch { return []; }
}

export default function DiagnosisList() {
  const [data, setData] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DiagnosisStatus | ''>('');
  const [routeFilter, setRouteFilter] = useState<DiagnosisRoute | ''>('');
  const [sourceFilter, setSourceFilter] = useState<DiagnosisSource | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'diagnosed_at' | 'updated_at' | 'next_action_due'>('diagnosed_at');
  const [sortDesc, setSortDesc] = useState(true);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (routeFilter) params.set('route', routeFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (search) params.set('q', search);

    fetch(`/api/diagnosis?${params}`)
      .then(res => res.json())
      .then(res => {
        setData((res.data || []).map(parseRow));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, routeFilter, sourceFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = (a as any)[sortBy] || '';
    const bVal = (b as any)[sortBy] || '';
    return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
  });

  const upcomingActions = sorted
    .filter(d => d.next_action_text && d.next_action_due)
    .sort((a, b) => a.next_action_due.localeCompare(b.next_action_due))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">AI診断一覧</h1>
        <Link
          to="/diagnosis/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          新規診断
        </Link>
      </div>

      {/* Upcoming Actions */}
      {upcomingActions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">直近の次アクション</h3>
          </div>
          <div className="space-y-2">
            {upcomingActions.map(d => (
              <Link
                key={d.id}
                to={`/diagnosis/${d.id}`}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{d.company_name}</span>
                  <span className="text-sm text-gray-500">{d.next_action_text}</span>
                </div>
                <span className="text-xs font-medium text-amber-700 whitespace-nowrap">{d.next_action_due}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="会社名・担当者・キーワードで検索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200">
              検索
            </button>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4 mr-1" />
            フィルタ
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as DiagnosisStatus | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全ステータス</option>
              {DIAGNOSIS_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value as DiagnosisRoute | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全ルート</option>
              {DIAGNOSIS_ROUTES.map(r => <option key={r} value={r}>{ROUTE_LABELS[r]}</option>)}
            </select>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as DiagnosisSource | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全チャネル</option>
              {DIAGNOSIS_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
            {(statusFilter || routeFilter || sourceFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setRouteFilter(''); setSourceFilter(''); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                クリア
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{sorted.length} 件</span>
        <span className="text-gray-300">|</span>
        <span>並び替え:</span>
        {([['diagnosed_at', '診断日'], ['updated_at', '更新日'], ['next_action_due', '期限']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { if (sortBy === key) { setSortDesc(!sortDesc); } else { setSortBy(key); setSortDesc(true); } }}
            className={`px-2 py-0.5 rounded ${sortBy === key ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-100'}`}
          >
            {label}{sortBy === key ? (sortDesc ? ' ↓' : ' ↑') : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">該当する診断データがありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会社名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">診断日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ルート</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">次アクション</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期限</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sorted.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/diagnosis/${d.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        {d.company_name}
                      </Link>
                      {d.industry && <span className="ml-2 text-xs text-gray-400">{d.industry}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{d.diagnosed_at}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {ROUTE_LABELS[d.route as keyof typeof ROUTE_LABELS] || d.route}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status as DiagnosisStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[d.status as DiagnosisStatus] || d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.owner}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{d.next_action_text || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {d.next_action_due ? (
                        <span className={new Date(d.next_action_due) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {d.next_action_due}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
