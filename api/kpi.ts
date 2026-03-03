import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

interface KpiData {
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

const MOCK_DATA: KpiData[] = [
  { date: '2023-10-01', leads_meetup: 20, workshop_applied: 5, workshop_attended_companies: 4, diagnosis_done: 2, proposals_sent: 2, contracts_new: 1, mrr: 100000, churned: 0, cases_published: 0, referrals: 0, leads_from_case: 0 },
  { date: '2023-11-01', leads_meetup: 25, workshop_applied: 8, workshop_attended_companies: 6, diagnosis_done: 4, proposals_sent: 3, contracts_new: 2, mrr: 200000, churned: 0, cases_published: 1, referrals: 1, leads_from_case: 2 },
  { date: '2023-12-01', leads_meetup: 15, workshop_applied: 4, workshop_attended_companies: 3, diagnosis_done: 1, proposals_sent: 1, contracts_new: 0, mrr: 0, churned: 50000, cases_published: 0, referrals: 0, leads_from_case: 0 },
  { date: '2024-01-01', leads_meetup: 30, workshop_applied: 10, workshop_attended_companies: 8, diagnosis_done: 5, proposals_sent: 4, contracts_new: 3, mrr: 300000, churned: 0, cases_published: 1, referrals: 2, leads_from_case: 5 },
];

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({ email, key, scopes: SCOPES });
}

async function handleGet(res: VercelResponse) {
  const auth = getAuthClient();
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  if (!auth || !SPREADSHEET_ID) {
    return res.json({ data: MOCK_DATA, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'kpi_daily!A2:L',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.json({ data: [], isMock: false });
    }

    const data: KpiData[] = rows.map((row) => ({
      date: row[0],
      leads_meetup: Number(row[1] || 0),
      workshop_applied: Number(row[2] || 0),
      workshop_attended_companies: Number(row[3] || 0),
      diagnosis_done: Number(row[4] || 0),
      proposals_sent: Number(row[5] || 0),
      contracts_new: Number(row[6] || 0),
      mrr: Number(row[7] || 0),
      churned: Number(row[8] || 0),
      cases_published: Number(row[9] || 0),
      referrals: Number(row[10] || 0),
      leads_from_case: Number(row[11] || 0),
    }));

    res.json({ data, isMock: false });
  } catch (error) {
    console.error('Error fetching from Sheets:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const newData: KpiData = req.body;
  const auth = getAuthClient();
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  if (!auth || !SPREADSHEET_ID) {
    const existingIndex = MOCK_DATA.findIndex(d => d.date === newData.date);
    if (existingIndex >= 0) {
      MOCK_DATA[existingIndex] = newData;
    } else {
      MOCK_DATA.push(newData);
    }
    return res.json({ success: true, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'kpi_daily!A:A',
    });

    const dateRows = getResponse.data.values || [];
    const rowIndex = dateRows.findIndex(row => row[0] === newData.date);

    const rowData = [
      newData.date,
      newData.leads_meetup,
      newData.workshop_applied,
      newData.workshop_attended_companies,
      newData.diagnosis_done,
      newData.proposals_sent,
      newData.contracts_new,
      newData.mrr,
      newData.churned,
      newData.cases_published,
      newData.referrals,
      newData.leads_from_case,
    ];

    if (rowIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `kpi_daily!A${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'kpi_daily!A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    }

    res.json({ success: true, isMock: false });
  } catch (error) {
    console.error('Error writing to Sheets:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { date } = req.body;
  const auth = getAuthClient();
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  if (!auth || !SPREADSHEET_ID) {
    const index = MOCK_DATA.findIndex(d => d.date === date);
    if (index > -1) MOCK_DATA.splice(index, 1);
    return res.json({ success: true, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'kpi_daily!A:A',
    });

    const dateRows = getResponse.data.values || [];
    const rowIndex = dateRows.findIndex(row => row[0] === date);

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Date not found' });
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `kpi_daily!A${rowIndex + 1}:L${rowIndex + 1}`,
    });

    res.json({ success: true, isMock: false });
  } catch (error) {
    console.error('Error deleting from Sheets:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(res);
      case 'POST':
        return await handlePost(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
