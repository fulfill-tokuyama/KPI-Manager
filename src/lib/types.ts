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
