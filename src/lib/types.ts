// ── KPI Daily ──
export interface KpiData {
  date: string;
  leads_meetup: number;
  workshop_applied: number;
  workshop_attended_companies: number;
  diagnosis_done: number;
  proposals_sent: number;
  contracts_new: number;
  mrr: number;
  churned: number;
  cases_published: number;
  referrals: number;
  leads_from_case: number;
}

export const KPI_LABELS: Record<keyof Omit<KpiData, 'date'>, string> = {
  leads_meetup: '経営者接点数',
  workshop_applied: '勉強会申込数',
  workshop_attended_companies: '勉強会参加企業数',
  diagnosis_done: 'AI診断実施数',
  proposals_sent: '提案数',
  contracts_new: '新規契約数',
  mrr: 'MRR増分',
  churned: '解約数/MRR',
  cases_published: '事例公開数',
  referrals: '紹介発生数',
  leads_from_case: '事例経由リード数',
};

export const PRIMARY_KPI_KEYS: (keyof Omit<KpiData, 'date'>)[] = [
  'leads_meetup',
  'diagnosis_done',
  'contracts_new',
  'cases_published',
];

// ── KPI Targets (月次目標) ──
export interface KpiTarget {
  month: string; // YYYY-MM
  leads_meetup: number;
  diagnosis_done: number;
  contracts_new: number;
  cases_published: number;
}

export const TARGET_KPI_LABELS: Record<keyof Omit<KpiTarget, 'month'>, string> = {
  leads_meetup: '経営者接点数',
  diagnosis_done: '診断実施数',
  contracts_new: '新規契約数',
  cases_published: '事例公開数',
};

// ── Diagnosis (案件) ──
export const DIAGNOSIS_STATUSES = [
  'diagnosed',
  'proposed',
  'quoted',
  'won',
  'in_progress',
  'case_ready',
  'case_published',
  'lost',
  'on_hold',
] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

export const STATUS_LABELS: Record<DiagnosisStatus, string> = {
  diagnosed: '診断完了',
  proposed: '提案済',
  quoted: '見積済',
  won: '契約',
  in_progress: '稼働中',
  case_ready: '事例化OK',
  case_published: '事例公開済',
  lost: '失注',
  on_hold: '保留',
};

export const STATUS_COLORS: Record<DiagnosisStatus, string> = {
  diagnosed: 'bg-sky-100 text-sky-800',
  proposed: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-violet-100 text-violet-800',
  won: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-blue-100 text-blue-800',
  case_ready: 'bg-amber-100 text-amber-800',
  case_published: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-600',
};

export const DIAGNOSIS_ROUTES = ['dispatch', 'training', 'aio'] as const;
export type DiagnosisRoute = (typeof DIAGNOSIS_ROUTES)[number];

export const ROUTE_LABELS: Record<DiagnosisRoute, string> = {
  dispatch: '派遣',
  training: '研修',
  aio: 'AIO',
};

export const DIAGNOSIS_SOURCES = ['meetup', 'sns', 'referral', 'other'] as const;
export type DiagnosisSource = (typeof DIAGNOSIS_SOURCES)[number];

export const SOURCE_LABELS: Record<DiagnosisSource, string> = {
  meetup: '交流会',
  sns: 'SNS',
  referral: '紹介',
  other: 'その他',
};

export interface Diagnosis {
  id: string;
  diagnosed_at: string;
  company_name: string;
  industry: string;
  employee_size: string;
  source: DiagnosisSource;
  owner: string;
  route: DiagnosisRoute;
  status: DiagnosisStatus;
  pains: string[];
  initiatives: string[];
  impact_note: string;
  next_action_text: string;
  next_action_due: string;
  links: string[];
  updated_at: string;
}

// Status progression order for pipeline aggregation
const STATUS_ORDER: DiagnosisStatus[] = [
  'diagnosed', 'proposed', 'quoted', 'won', 'in_progress', 'case_ready', 'case_published',
];

export function isStatusAtLeast(status: DiagnosisStatus, threshold: DiagnosisStatus): boolean {
  if (status === 'lost' || status === 'on_hold') return false;
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(threshold);
}
