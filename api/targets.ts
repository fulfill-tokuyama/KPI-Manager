import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, getSpreadsheetId } from './_sheets.js';

interface KpiTarget {
  month: string;
  leads_meetup: number;
  workshop_attended_companies: number;
  diagnosis_done: number;
  diagnosis_conversion_rate: number;
  contracts_new: number;
  cases_published: number;
}

const MOCK_TARGETS: KpiTarget[] = [
  { month: '2024-01', leads_meetup: 30, workshop_attended_companies: 8, diagnosis_done: 5, diagnosis_conversion_rate: 62.5, contracts_new: 3, cases_published: 1 },
  { month: '2024-02', leads_meetup: 35, workshop_attended_companies: 10, diagnosis_done: 6, diagnosis_conversion_rate: 60, contracts_new: 3, cases_published: 2 },
  { month: '2024-03', leads_meetup: 40, workshop_attended_companies: 12, diagnosis_done: 8, diagnosis_conversion_rate: 66.7, contracts_new: 4, cases_published: 2 },
  { month: '2026-03', leads_meetup: 25, workshop_attended_companies: 8, diagnosis_done: 8, diagnosis_conversion_rate: 100, contracts_new: 4, cases_published: 2 },
];

function rowToTarget(row: string[]): KpiTarget {
  return {
    month: row[0] || '',
    leads_meetup: Number(row[1] || 0),
    workshop_attended_companies: Number(row[2] || 0),
    diagnosis_done: Number(row[3] || 0),
    diagnosis_conversion_rate: Number(row[4] || 0),
    contracts_new: Number(row[5] || 0),
    cases_published: Number(row[6] || 0),
  };
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { month } = req.query as Record<string, string | undefined>;
  const auth = getAuthClient();
  const SPREADSHEET_ID = getSpreadsheetId();

  if (!auth || !SPREADSHEET_ID) {
    const data = month ? MOCK_TARGETS.filter(t => t.month === month) : MOCK_TARGETS;
    return res.json({ data, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'kpi_targets!A2:G',
    });
    const rows = response.data.values || [];
    let data = rows.filter(r => r[0]).map(rowToTarget);
    if (month) data = data.filter(t => t.month === month);
    res.json({ data, isMock: false });
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body: KpiTarget = req.body;
  const auth = getAuthClient();
  const SPREADSHEET_ID = getSpreadsheetId();

  if (!body.month) return res.status(400).json({ error: 'month is required' });

  if (!auth || !SPREADSHEET_ID) {
    const idx = MOCK_TARGETS.findIndex(t => t.month === body.month);
    if (idx >= 0) {
      MOCK_TARGETS[idx] = body;
    } else {
      MOCK_TARGETS.push(body);
    }
    return res.json({ success: true, data: body, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'kpi_targets!A:A',
    });
    const monthRows = getResponse.data.values || [];
    const rowIndex = monthRows.findIndex(row => row[0] === body.month);
    const rowData = [body.month, body.leads_meetup, body.workshop_attended_companies, body.diagnosis_done, body.diagnosis_conversion_rate, body.contracts_new, body.cases_published];

    if (rowIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `kpi_targets!A${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'kpi_targets!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    }
    res.json({ success: true, data: body, isMock: false });
  } catch (error) {
    console.error('Error saving target:', error);
    res.status(500).json({ error: 'Failed to save target' });
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
