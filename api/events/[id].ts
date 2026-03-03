import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsClient } from '../_sheets.js';
import { MOCK_EVENTS, EventRow, EVENT_SHEET_COLUMNS } from '../_events_mock.js';

function rowToObj(row: string[]): EventRow {
  const obj: any = {};
  EVENT_SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] || ''; });
  return obj as EventRow;
}

function objToRow(d: EventRow): string[] {
  return EVENT_SHEET_COLUMNS.map(col => (d as any)[col] ?? '');
}

async function handlePut(id: string, req: VercelRequest, res: VercelResponse) {
  const body = req.body;
  const now = new Date().toISOString();
  const client = await getSheetsClient();

  if (!client) {
    const idx = MOCK_EVENTS.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const updated: EventRow = {
      ...MOCK_EVENTS[idx],
      event_date: body.event_date ?? MOCK_EVENTS[idx].event_date,
      event_name: body.event_name ?? MOCK_EVENTS[idx].event_name,
      cost_yen: body.cost_yen != null ? String(Number(body.cost_yen) || 0) : MOCK_EVENTS[idx].cost_yen,
      contacts_count: body.contacts_count != null ? String(Number(body.contacts_count) || 0) : MOCK_EVENTS[idx].contacts_count,
      appointments_count: body.appointments_count != null ? String(Number(body.appointments_count) || 0) : MOCK_EVENTS[idx].appointments_count,
      notes: body.notes ?? MOCK_EVENTS[idx].notes,
      updated_at: now,
    };
    MOCK_EVENTS[idx] = updated;
    return res.json({ success: true, data: updated, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'events!A:A' });
    const idRows = response.data.values || [];
    const rowIndex = idRows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Not found' });

    const getRow = await sheets.spreadsheets.values.get({ spreadsheetId, range: `events!A${rowIndex + 1}:I${rowIndex + 1}` });
    const existing = rowToObj(getRow.data.values?.[0] || []);
    const updated: EventRow = {
      ...existing,
      event_date: body.event_date ?? existing.event_date,
      event_name: body.event_name ?? existing.event_name,
      cost_yen: body.cost_yen != null ? String(Number(body.cost_yen) || 0) : existing.cost_yen,
      contacts_count: body.contacts_count != null ? String(Number(body.contacts_count) || 0) : existing.contacts_count,
      appointments_count: body.appointments_count != null ? String(Number(body.appointments_count) || 0) : existing.appointments_count,
      notes: body.notes ?? existing.notes,
      updated_at: now,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `events!A${rowIndex + 1}:I${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [objToRow(updated)] },
    });
    res.json({ success: true, data: updated, isMock: false });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
}

async function handleDelete(id: string, res: VercelResponse) {
  const client = await getSheetsClient();

  if (!client) {
    const idx = MOCK_EVENTS.findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    MOCK_EVENTS.splice(idx, 1);
    return res.json({ success: true, isMock: true });
  }

  try {
    const { sheets, spreadsheetId } = client;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'events!A:A' });
    const idRows = response.data.values || [];
    const rowIndex = idRows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Not found' });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `events!A${rowIndex + 1}:I${rowIndex + 1}` });
    res.json({ success: true, isMock: false });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const eventId = Array.isArray(id) ? id[0] : id;
  if (!eventId) return res.status(400).json({ error: 'Missing id' });

  try {
    switch (req.method) {
      case 'PUT': return await handlePut(eventId, req, res);
      case 'DELETE': return await handleDelete(eventId, res);
      default:
        res.setHeader('Allow', 'PUT, DELETE');
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
