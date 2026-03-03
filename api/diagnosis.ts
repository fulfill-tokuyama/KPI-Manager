import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsClient } from './_sheets.js';
import { MOCK_DIAGNOSES, DiagnosisRow, DIAGNOSIS_SHEET_COLUMNS } from './_diagnosis_mock.js';

function rowToObj(row: string[]): DiagnosisRow {
  const obj: any = {};
  DIAGNOSIS_SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
  return obj as DiagnosisRow;
}

function objToRow(d: DiagnosisRow): string[] {
  return DIAGNOSIS_SHEET_COLUMNS.map(col => (d as any)[col] ?? '');
}

function generateId(): string {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function matchesFilter(d: DiagnosisRow, query: Record<string, string | undefined>): boolean {
  if (query.status && d.status !== query.status) return false;
  if (query.route && d.route !== query.route) return false;
  if (query.source && d.source !== query.source) return false;
  if (query.owner && d.owner !== query.owner) return false;
  if (query.from && d.diagnosed_at < query.from) return false;
  if (query.to && d.diagnosed_at > query.to) return false;
  if (query.q) {
    const q = query.q.toLowerCase();
    const searchable = [d.company_name, d.owner, d.pains, d.initiatives, d.impact_note].join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }
  return true;
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const query = req.query as Record<string, string | undefined>;
  const client = await getSheetsClient();

  if (!client) {
    const filtered = MOCK_DIAGNOSES.filter(d => matchesFilter(d, query));
    return res.json({ data: filtered, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'diagnosis!A2:P' });
    const rows = response.data.values || [];
    const all = rows.filter(r => r[0]).map(rowToObj);
    const filtered = all.filter(d => matchesFilter(d, query));
    res.json({ data: filtered, isMock: false });
  } catch (error) {
    console.error('Error fetching diagnoses:', error);
    const filtered = MOCK_DIAGNOSES.filter(d => matchesFilter(d, query));
    res.json({ data: filtered, isMock: true });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = req.body;
  const now = new Date().toISOString().split('T')[0];

  const newRow: DiagnosisRow = {
    id: generateId(),
    diagnosed_at: body.diagnosed_at || now,
    company_name: body.company_name || '',
    industry: body.industry || '',
    employee_size: body.employee_size || '',
    source: body.source || 'other',
    owner: body.owner || '',
    route: body.route || 'dispatch',
    status: body.status || 'diagnosed',
    pains: typeof body.pains === 'string' ? body.pains : JSON.stringify(body.pains || []),
    initiatives: typeof body.initiatives === 'string' ? body.initiatives : JSON.stringify(body.initiatives || []),
    impact_note: body.impact_note || '',
    next_action_text: body.next_action_text || '',
    next_action_due: body.next_action_due || '',
    links: typeof body.links === 'string' ? body.links : JSON.stringify(body.links || []),
    updated_at: now,
  };

  const client = await getSheetsClient();
  if (!client) {
    MOCK_DIAGNOSES.push(newRow);
    return res.json({ success: true, data: newRow, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: 'diagnosis!A:P',
      valueInputOption: 'USER_ENTERED', requestBody: { values: [objToRow(newRow)] },
    });
    res.json({ success: true, data: newRow, isMock: false });
  } catch (error) {
    console.error('Error creating diagnosis:', error);
    res.status(500).json({ error: 'Failed to create diagnosis' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET': return await handleGet(req, res);
      case 'POST': return await handlePost(req, res);
      default:
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
