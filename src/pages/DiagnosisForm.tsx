import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, Trash2, ArrowLeft, Plus, X, ExternalLink } from 'lucide-react';
import {
  Diagnosis, DiagnosisStatus, DiagnosisRoute, DiagnosisSource,
  DIAGNOSIS_STATUSES, DIAGNOSIS_ROUTES, DIAGNOSIS_SOURCES,
  STATUS_LABELS, STATUS_COLORS, ROUTE_LABELS, SOURCE_LABELS,
} from '../lib/types';

const EMPTY: Diagnosis = {
  id: '', diagnosed_at: new Date().toISOString().split('T')[0],
  company_name: '', industry: '', employee_size: '', source: 'meetup',
  owner: '', route: 'dispatch', status: 'diagnosed',
  pains: [], initiatives: [], impact_note: '',
  next_action_text: '', next_action_due: '', links: [], updated_at: '',
};

export default function DiagnosisForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState<Diagnosis>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Temp inputs for array fields
  const [painInput, setPainInput] = useState('');
  const [initInput, setInitInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      fetch(`/api/diagnosis/${id}`)
        .then(res => res.json())
        .then(res => {
          if (res.data) {
            const d = res.data;
            setForm({
              ...d,
              pains: typeof d.pains === 'string' ? tryParse(d.pains) : d.pains || [],
              initiatives: typeof d.initiatives === 'string' ? tryParse(d.initiatives) : d.initiatives || [],
              links: typeof d.links === 'string' ? tryParse(d.links) : d.links || [],
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addToArray = (field: 'pains' | 'initiatives' | 'links', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setForm(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    setter('');
  };

  const removeFromArray = (field: 'pains' | 'initiatives' | 'links', index: number) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');

    const body = {
      ...form,
      pains: JSON.stringify(form.pains),
      initiatives: JSON.stringify(form.initiatives),
      links: JSON.stringify(form.links),
    };

    try {
      const url = isNew ? '/api/diagnosis' : `/api/diagnosis/${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus('success');
        const result = await res.json();
        if (isNew && result.data?.id) {
          setTimeout(() => navigate(`/diagnosis/${result.data.id}`), 800);
        } else {
          setTimeout(() => setStatus('idle'), 2000);
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この診断レコードを削除しますか？')) return;
    try {
      const res = await fetch(`/api/diagnosis/${id}`, { method: 'DELETE' });
      if (res.ok) navigate('/diagnosis');
    } catch {
      alert('削除に失敗しました');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/diagnosis" className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          診断一覧
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{isNew ? '新規登録' : form.company_name}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">基本情報</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
              <input name="company_name" required value={form.company_name} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">診断日 *</label>
              <input type="date" name="diagnosed_at" required value={form.diagnosed_at} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者 *</label>
              <input name="owner" required value={form.owner} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">相談チャネル</label>
              <select name="source" value={form.source} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500">
                {DIAGNOSIS_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提案ルート</label>
              <select name="route" value={form.route} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500">
                {DIAGNOSIS_ROUTES.map(r => <option key={r} value={r}>{ROUTE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
              <input name="industry" value={form.industry} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">従業員規模</label>
              <select name="employee_size" value={form.employee_size} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">選択してください</option>
                <option value="1-10">1-10名</option>
                <option value="10-50">10-50名</option>
                <option value="50-100">50-100名</option>
                <option value="100-300">100-300名</option>
                <option value="300+">300名以上</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">ステータス</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {DIAGNOSIS_STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: s }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                    form.status === s
                      ? `${STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current/20`
                      : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnosis Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">診断内容</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Pains */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">課題</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.pains.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                    {p}
                    <button type="button" onClick={() => removeFromArray('pains', i)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={painInput} onChange={e => setPainInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('pains', painInput, setPainInput); } }}
                  placeholder="課題を入力してEnter"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                <button type="button" onClick={() => addToArray('pains', painInput, setPainInput)}
                  className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Initiatives */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">施策</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.initiatives.map((init, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {init}
                    <button type="button" onClick={() => removeFromArray('initiatives', i)} className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={initInput} onChange={e => setInitInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('initiatives', initInput, setInitInput); } }}
                  placeholder="施策を入力してEnter"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                <button type="button" onClick={() => addToArray('initiatives', initInput, setInitInput)}
                  className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Impact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期待効果</label>
              <textarea name="impact_note" value={form.impact_note} onChange={handleChange} rows={2}
                placeholder="例: 月20時間削減、売上15%向上見込み"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Next Action Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">次アクション</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <input name="next_action_text" value={form.next_action_text} onChange={handleChange}
                placeholder="例: 提案資料作成、クロージング面談"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
              <input type="date" name="next_action_due" value={form.next_action_due} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Links Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">関連リンク</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2 mb-3">
              {form.links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate flex-1 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />{link}
                  </a>
                  <button type="button" onClick={() => removeFromArray('links', i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('links', linkInput, setLinkInput); } }}
                placeholder="URLを入力"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              <button type="button" onClick={() => addToArray('links', linkInput, setLinkInput)}
                className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {!isNew && (
            <button type="button" onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200">
              <Trash2 className="w-4 h-4 mr-2" />削除
            </button>
          )}
          <div className="flex-1 flex justify-end gap-3">
            <Link to="/diagnosis" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              キャンセル
            </Link>
            <button type="submit" disabled={saving}
              className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '保存中...' : <><Save className="w-4 h-4 mr-2" />保存</>}
            </button>
          </div>
        </div>

        {status === 'success' && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800">保存しました</p>
          </div>
        )}
        {status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-800">保存に失敗しました。もう一度お試しください。</p>
          </div>
        )}
      </form>
    </div>
  );
}

function tryParse(str: string): string[] {
  try { return JSON.parse(str); } catch { return []; }
}
