import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, getSpreadsheetId } from '../_sheets.js';
import { MOCK_DIAGNOSES, DiagnosisRow, DIAGNOSIS_SHEET_COLUMNS } from '../_diagnosis_mock.js';

function rowToObj(row: string[]): DiagnosisRow {
  const obj: any = {};
  DIAGNOSIS_SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
  return obj as DiagnosisRow;
}

function objToRow(d: DiagnosisRow): string[] {
  return DIAGNOSIS_SHEET_COLUMNS.map(col => (d as any)[col] ?? '');
}

async function handleGet(id: string, res: VercelResponse) {
  const auth = getAuthClient();
  const SPREADSHEET_ID = getSpreadsheetId();

  if (!auth || !SPREADSHEET_ID) {
    const found = MOCK_DIAGNOSES.find(d => d.id === id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: found, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'diagnosis!A2:P',
    });
    const rows = response.data.values || [];
    const all = rows.filter(r => r[0]).map(rowToObj);
    const found = all.find(d => d.id === id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ data: found, isMock: false });
  } catch (error) {
    console.error('Error fetching diagnosis:', error);
    res.status(500).json({ error: 'Failed to fetch diagnosis' });
  }
}

async function handlePut(id: string, req: VercelRequest, res: VercelResponse) {
  const body = req.body;
  const auth = getAuthClient();
  const SPREADSHEET_ID = getSpreadsheetId();
  const now = new Date().toISOString().split('T')[0];

  if (!auth || !SPREADSHEET_ID) {
    const idx = MOCK_DIAGNOSES.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const updated: DiagnosisRow = {
      ...MOCK_DIAGNOSES[idx],
      ...body,
      id,
      pains: typeof body.pains === 'string' ? body.pains : JSON.stringify(body.pains || MOCK_DIAGNOSES[idx].pains),
      initiatives: typeof body.initiatives === 'string' ? body.initiatives : JSON.stringify(body.initiatives || MOCK_DIAGNOSES[idx].initiatives),
      links: typeof body.links === 'string' ? body.links : JSON.stringify(body.links || MOCK_DIAGNOSES[idx].links),
      updated_at: now,
    };
    MOCK_DIAGNOSES[idx] = updated;
    return res.json({ success: true, data: updated, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'diagnosis!A:A',
    });
    const idRows = response.data.values || [];
    const rowIndex = idRows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Not found' });

    const getRow = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `diagnosis!A${rowIndex + 1}:P${rowIndex + 1}`,
    });
    const existing = rowToObj(getRow.data.values?.[0] || []);
    const updated: DiagnosisRow = {
      ...existing,
      ...body,
      id,
      pains: typeof body.pains === 'string' ? body.pains : JSON.stringify(body.pains || []),
      initiatives: typeof body.initiatives === 'string' ? body.initiatives : JSON.stringify(body.initiatives || []),
      links: typeof body.links === 'string' ? body.links : JSON.stringify(body.links || []),
      updated_at: now,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `diagnosis!A${rowIndex + 1}:P${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [objToRow(updated)] },
    });
    res.json({ success: true, data: updated, isMock: false });
  } catch (error) {
    console.error('Error updating diagnosis:', error);
    res.status(500).json({ error: 'Failed to update diagnosis' });
  }
}

async function handleDelete(id: string, res: VercelResponse) {
  const auth = getAuthClient();
  const SPREADSHEET_ID = getSpreadsheetId();

  if (!auth || !SPREADSHEET_ID) {
    const idx = MOCK_DIAGNOSES.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    MOCK_DIAGNOSES.splice(idx, 1);
    return res.json({ success: true, isMock: true });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'diagnosis!A:A',
    });
    const idRows = response.data.values || [];
    const rowIndex = idRows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Not found' });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `diagnosis!A${rowIndex + 1}:P${rowIndex + 1}`,
    });
    res.json({ success: true, isMock: false });
  } catch (error) {
    console.error('Error deleting diagnosis:', error);
    res.status(500).json({ error: 'Failed to delete diagnosis' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const diagId = Array.isArray(id) ? id[0] : id;
  if (!diagId) return res.status(400).json({ error: 'Missing id' });

  try {
    switch (req.method) {
      case 'GET': return await handleGet(diagId, res);
      case 'PUT': return await handlePut(diagId, req, res);
      case 'DELETE': return await handleDelete(diagId, res);
      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
