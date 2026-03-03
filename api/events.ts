import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsClient } from './_sheets.js';
import { MOCK_EVENTS, EventRow, EVENT_SHEET_COLUMNS } from './_events_mock.js';

function rowToObj(row: string[]): EventRow {
  const obj: any = {};
  EVENT_SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
  return obj as EventRow;
}

function objToRow(d: EventRow): string[] {
  return EVENT_SHEET_COLUMNS.map(col => (d as any)[col] ?? '');
}

function generateId(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function matchesFilter(d: EventRow, query: Record<string, string | undefined>): boolean {
  if (query.from && d.event_date < query.from) return false;
  if (query.to && d.event_date > query.to) return false;
  if (query.q) {
    const q = query.q.toLowerCase();
    if (!d.event_name.toLowerCase().includes(q)) return false;
  }
  return true;
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const query = req.query as Record<string, string | undefined>;
  const client = await getSheetsClient();

  if (!client) {
    const filtered = MOCK_EVENTS.filter(d => matchesFilter(d, query));
    filtered.sort((a, b) => b.event_date.localeCompare(a.event_date));
    return res.json({ data: filtered, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'events!A2:I' });
    const rows = response.data.values || [];
    const all = rows.filter(r => r[0]).map(rowToObj);
    const filtered = all.filter(d => matchesFilter(d, query));
    filtered.sort((a, b) => b.event_date.localeCompare(a.event_date));
    res.json({ data: filtered, isMock: false });
  } catch (error) {
    console.error('Error fetching events:', error);
    const filtered = MOCK_EVENTS.filter(d => matchesFilter(d, query));
    filtered.sort((a, b) => b.event_date.localeCompare(a.event_date));
    res.json({ data: filtered, isMock: true });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = req.body;
  const now = new Date().toISOString();

  if (!body.event_date || !body.event_name || body.cost_yen == null) {
    return res.status(400).json({ error: 'event_date, event_name, cost_yen are required' });
  }

  const newRow: EventRow = {
    id: generateId(),
    event_date: body.event_date,
    event_name: body.event_name,
    cost_yen: String(Number(body.cost_yen) || 0),
    contacts_count: String(Number(body.contacts_count) || 0),
    appointments_count: String(Number(body.appointments_count) || 0),
    notes: body.notes || '',
    created_at: now,
    updated_at: now,
  };

  const client = await getSheetsClient();
  if (!client) {
    MOCK_EVENTS.push(newRow);
    return res.json({ success: true, data: newRow, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: 'events!A:I',
      valueInputOption: 'USER_ENTERED', requestBody: { values: [objToRow(newRow)] },
    });
    res.json({ success: true, data: newRow, isMock: false });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
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
