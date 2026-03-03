import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsClient } from './_sheets.js';
import { MOCK_DIAGNOSES, DiagnosisRow, DIAGNOSIS_SHEET_COLUMNS } from './_diagnosis_mock.js';

const PIPELINE_STATUSES = ['diagnosed', 'proposed', 'quoted', 'won', 'in_progress', 'case_ready', 'case_published'];

function isAtLeast(status: string, threshold: string): boolean {
  if (status === 'lost' || status === 'on_hold') return false;
  return PIPELINE_STATUSES.indexOf(status) >= PIPELINE_STATUSES.indexOf(threshold);
}

function rowToObj(row: string[]): DiagnosisRow {
  const obj: any = {};
  DIAGNOSIS_SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
  return obj as DiagnosisRow;
}

function computeAnalytics(diagnoses: DiagnosisRow[], from?: string, to?: string) {
  let filtered = diagnoses;
  if (from) filtered = filtered.filter(d => d.diagnosed_at >= from);
  if (to) filtered = filtered.filter(d => d.diagnosed_at <= to);

  const total = filtered.length;
  const diagnosed_count = filtered.filter(d => isAtLeast(d.status, 'diagnosed')).length;
  const proposed_count = filtered.filter(d => isAtLeast(d.status, 'proposed')).length;
  const quoted_count = filtered.filter(d => isAtLeast(d.status, 'quoted')).length;
  const won_count = filtered.filter(d => isAtLeast(d.status, 'won')).length;
  const case_published_count = filtered.filter(d => d.status === 'case_published').length;
  const lost_count = filtered.filter(d => d.status === 'lost').length;
  const on_hold_count = filtered.filter(d => d.status === 'on_hold').length;

  const by_route = {
    dispatch: filtered.filter(d => d.route === 'dispatch').length,
    training: filtered.filter(d => d.route === 'training').length,
    aio: filtered.filter(d => d.route === 'aio').length,
  };

  const by_source = {
    meetup: filtered.filter(d => d.source === 'meetup').length,
    sns: filtered.filter(d => d.source === 'sns').length,
    referral: filtered.filter(d => d.source === 'referral').length,
    other: filtered.filter(d => d.source === 'other').length,
  };

  return {
    total,
    diagnosed_count,
    proposed_count,
    quoted_count,
    won_count,
    case_published_count,
    lost_count,
    on_hold_count,
    by_route,
    by_source,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { from, to } = req.query as Record<string, string | undefined>;
  const client = await getSheetsClient();

  if (!client) {
    const analytics = computeAnalytics(MOCK_DIAGNOSES, from, to);
    return res.json({ data: analytics, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'diagnosis!A2:P' });
    const rows = response.data.values || [];
    const all = rows.filter(r => r[0]).map(rowToObj);
    const analytics = computeAnalytics(all, from, to);
    res.json({ data: analytics, isMock: false });
  } catch (error) {
    console.error('Error computing analytics:', error);
    const analytics = computeAnalytics(MOCK_DIAGNOSES, from, to);
    res.json({ data: analytics, isMock: true });
  }
}
