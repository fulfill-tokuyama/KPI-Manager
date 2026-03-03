import { KpiData } from './types';

export interface KpiMetrics {
  total_leads_meetup: number;
  workshop_application_rate: number; // 勉強会申込率
  total_workshop_attended: number;
  diagnosis_conversion_rate: number; // AI診断移行率
  total_diagnosis_done: number;
  contract_rate: number; // バックエンド契約率
  total_contracts_new: number;
  total_mrr: number;
  average_unit_price: number; // 平均単価
  retention_rate: number; // 継続率
  total_cases_published: number;
  total_referrals: number;
  case_lead_rate: number; // 事例経由リード率
}

export function calculateMetrics(data: KpiData[]): KpiMetrics {
  const sum = (key: keyof KpiData) => data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);

  const total_leads_meetup = sum('leads_meetup');
  const total_workshop_applied = sum('workshop_applied');
  const total_workshop_attended = sum('workshop_attended_companies');
  const total_diagnosis_done = sum('diagnosis_done');
  const total_proposals_sent = sum('proposals_sent');
  const total_contracts_new = sum('contracts_new');
  const total_mrr = sum('mrr');
  const total_churned = sum('churned');
  const total_cases_published = sum('cases_published');
  const total_referrals = sum('referrals');
  const total_leads_from_case = sum('leads_from_case');

  // Calculations
  const workshop_application_rate = total_leads_meetup > 0 ? total_workshop_applied / total_leads_meetup : 0;
  const diagnosis_conversion_rate = total_workshop_attended > 0 ? total_diagnosis_done / total_workshop_attended : 0;
  const contract_rate = total_diagnosis_done > 0 ? total_contracts_new / total_diagnosis_done : 0;
  
  const average_unit_price = total_contracts_new > 0 ? total_mrr / total_contracts_new : 0;

  // Retention Rate (Simplified: 1 - (churned / (new + existing_estimate)))
  // Assuming existing_estimate is 0 for MVP if not provided, or just based on new contracts for now.
  // Better simplified formula for MVP: 1 - (churned / total_contracts_cumulative_so_far)
  // But since we only have a window of data, let's use: 1 - (churned / (contracts_new + 1)) to avoid division by zero, or just 0 if no contracts.
  // Let's stick to the prompt's simplified suggestion: "churned / (contracts_new + 既存推定)"
  // We'll assume "existing estimate" is negligible for MVP calculation if not tracked, or just use contracts_new.
  const denominator = total_contracts_new > 0 ? total_contracts_new : 1; 
  const retention_rate = 1 - (total_churned / denominator);

  const case_lead_rate = total_leads_meetup > 0 ? total_leads_from_case / total_leads_meetup : 0;

  return {
    total_leads_meetup,
    workshop_application_rate,
    total_workshop_attended,
    diagnosis_conversion_rate,
    total_diagnosis_done,
    contract_rate,
    total_contracts_new,
    total_mrr,
    average_unit_price,
    retention_rate,
    total_cases_published,
    total_referrals,
    case_lead_rate,
  };
}

export function filterDataByRange(data: KpiData[], range: 'current_month' | 'last_month' | 'last_90_days' | 'all'): KpiData[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return data.filter(d => {
    const date = new Date(d.date);
    if (range === 'current_month') {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
    if (range === 'last_month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
    }
    if (range === 'last_90_days') {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return date >= ninetyDaysAgo;
    }
    return true;
  });
}
