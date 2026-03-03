import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// --- Types ---
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

// --- Mock Data ---
const MOCK_DATA: KpiData[] = [
  { date: '2023-10-01', leads_meetup: 20, workshop_applied: 5, workshop_attended_companies: 4, diagnosis_done: 2, proposals_sent: 2, contracts_new: 1, mrr: 100000, churned: 0, cases_published: 0, referrals: 0, leads_from_case: 0 },
  { date: '2023-11-01', leads_meetup: 25, workshop_applied: 8, workshop_attended_companies: 6, diagnosis_done: 4, proposals_sent: 3, contracts_new: 2, mrr: 200000, churned: 0, cases_published: 1, referrals: 1, leads_from_case: 2 },
  { date: '2023-12-01', leads_meetup: 15, workshop_applied: 4, workshop_attended_companies: 3, diagnosis_done: 1, proposals_sent: 1, contracts_new: 0, mrr: 0, churned: 50000, cases_published: 0, referrals: 0, leads_from_case: 0 },
  { date: '2024-01-01', leads_meetup: 30, workshop_applied: 10, workshop_attended_companies: 8, diagnosis_done: 5, proposals_sent: 4, contracts_new: 3, mrr: 300000, churned: 0, cases_published: 1, referrals: 2, leads_from_case: 5 },
];

// --- Diagnosis Types & Mock ---
interface DiagnosisRow {
  id: string; diagnosed_at: string; company_name: string; industry: string;
  employee_size: string; source: string; owner: string; route: string;
  status: string; pains: string; initiatives: string; impact_note: string;
  next_action_text: string; next_action_due: string; links: string; updated_at: string;
}

const MOCK_DIAGNOSES: DiagnosisRow[] = [
  { id: 'd001', diagnosed_at: '2024-01-10', company_name: '株式会社テスト', industry: 'IT', employee_size: '50-100', source: 'meetup', owner: '田中', route: 'dispatch', status: 'won', pains: '["人手不足","DX推進"]', initiatives: '["AI活用研修","業務自動化"]', impact_note: '月20時間削減見込み', next_action_text: '契約書送付', next_action_due: '2024-02-01', links: '["https://example.com/proposal"]', updated_at: '2024-01-15' },
  { id: 'd002', diagnosed_at: '2024-01-15', company_name: '合同会社サンプル', industry: '製造', employee_size: '100-300', source: 'referral', owner: '鈴木', route: 'training', status: 'proposed', pains: '["品質管理","コスト削減"]', initiatives: '["検査AI導入","工程最適化"]', impact_note: '不良率50%低減', next_action_text: '見積提出', next_action_due: '2024-01-25', links: '[]', updated_at: '2024-01-18' },
  { id: 'd003', diagnosed_at: '2024-01-20', company_name: 'ABC商事', industry: '小売', employee_size: '10-50', source: 'sns', owner: '田中', route: 'aio', status: 'diagnosed', pains: '["在庫管理","売上予測"]', initiatives: '["需要予測AI","在庫自動発注"]', impact_note: '在庫回転率30%改善', next_action_text: '提案資料作成', next_action_due: '2024-02-05', links: '[]', updated_at: '2024-01-20' },
  { id: 'd004', diagnosed_at: '2023-12-01', company_name: 'XYZコンサルティング', industry: 'コンサル', employee_size: '10-50', source: 'meetup', owner: '鈴木', route: 'dispatch', status: 'case_published', pains: '["営業効率","顧客分析"]', initiatives: '["CRM AI化","営業支援ツール"]', impact_note: '売上15%向上', next_action_text: '', next_action_due: '', links: '["https://example.com/case-study"]', updated_at: '2024-01-05' },
  { id: 'd005', diagnosed_at: '2024-01-08', company_name: 'フューチャー建設', industry: '建設', employee_size: '300+', source: 'meetup', owner: '田中', route: 'training', status: 'quoted', pains: '["安全管理","人材育成"]', initiatives: '["安全AI監視","研修プログラム"]', impact_note: '事故率低減', next_action_text: 'クロージング面談', next_action_due: '2024-02-10', links: '["https://example.com/quote"]', updated_at: '2024-01-22' },
  { id: 'd006', diagnosed_at: '2023-11-15', company_name: 'メディカルプラス', industry: '医療', employee_size: '50-100', source: 'referral', owner: '鈴木', route: 'aio', status: 'in_progress', pains: '["事務効率","予約管理"]', initiatives: '["予約AI","電子カルテ連携"]', impact_note: '受付時間60%短縮', next_action_text: '月次レビュー', next_action_due: '2024-02-15', links: '[]', updated_at: '2024-01-10' },
];

const PIPELINE_STATUSES = ['diagnosed','proposed','quoted','won','in_progress','case_ready','case_published'];
function isStatusAtLeast(status: string, threshold: string): boolean {
  if (status === 'lost' || status === 'on_hold') return false;
  return PIPELINE_STATUSES.indexOf(status) >= PIPELINE_STATUSES.indexOf(threshold);
}

function generateId(): string {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Google Sheets Setup ---
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
  
  const getAuthClient = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!email || !key) return null;
    return new google.auth.JWT({ email, key, scopes: SCOPES });
  };

  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

  // --- API Routes ---

  // GET /api/kpi
  app.get('/api/kpi', async (req, res) => {
    const auth = getAuthClient();
    if (!auth || !SPREADSHEET_ID) {
      console.log('Using Mock Data (Missing Credentials)');
      return res.json({ data: MOCK_DATA, isMock: true });
    }

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'kpi_daily!A2:L', // Assuming header is row 1
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
  });

  // POST /api/kpi (Add or Update based on Date)
  app.post('/api/kpi', async (req, res) => {
    const newData: KpiData = req.body;
    const auth = getAuthClient();

    if (!auth || !SPREADSHEET_ID) {
      // Update mock data in memory for demo purposes
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
      
      // First, check if the date already exists to update it
      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'kpi_daily!A:A', // Get all dates
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
        newData.leads_from_case
      ];

      if (rowIndex >= 0) {
        // Update existing row (rowIndex is 0-based, Sheets is 1-based)
        // Row 1 is header, so if rowIndex is 1 (2nd item in array), it's row 2 in sheet?
        // Wait, getResponse includes header if we asked for A:A.
        // If header is row 1, dateRows[0] is header. dateRows[1] is first data row (row 2).
        // So sheet row number = rowIndex + 1.
        
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `kpi_daily!A${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowData] },
        });
      } else {
        // Append new row
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
  });

  // DELETE /api/kpi
  app.delete('/api/kpi', async (req, res) => {
    const { date } = req.body;
    const auth = getAuthClient();

    if (!auth || !SPREADSHEET_ID) {
       const index = MOCK_DATA.findIndex(d => d.date === date);
       if (index > -1) MOCK_DATA.splice(index, 1);
       return res.json({ success: true, isMock: true });
    }

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Find row index
      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'kpi_daily!A:A',
      });
      
      const dateRows = getResponse.data.values || [];
      const rowIndex = dateRows.findIndex(row => row[0] === date);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Date not found' });
      }

      // Delete row request
      // Note: This requires spreadsheetId (numeric), not the string ID.
      // Since getting the numeric sheet ID is an extra step, for MVP we might just clear the row content
      // or implement a proper batchUpdate if we had the sheetId.
      // For simplicity in this MVP, let's just clear the content of the row.
      
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `kpi_daily!A${rowIndex + 1}:L${rowIndex + 1}`,
      });

      // Ideally we would delete the dimension to shift rows up, but clear is safer for MVP without sheetId lookup.
      res.json({ success: true, isMock: false });
    } catch (error) {
      console.error('Error deleting from Sheets:', error);
      res.status(500).json({ error: 'Failed to delete data' });
    }
  });


  // --- Diagnosis API Routes ---

  app.get('/api/diagnosis', (req, res) => {
    const { status, route, source, owner, from, to, q } = req.query as Record<string, string | undefined>;
    let filtered = [...MOCK_DIAGNOSES];
    if (status) filtered = filtered.filter(d => d.status === status);
    if (route) filtered = filtered.filter(d => d.route === route);
    if (source) filtered = filtered.filter(d => d.source === source);
    if (owner) filtered = filtered.filter(d => d.owner === owner);
    if (from) filtered = filtered.filter(d => d.diagnosed_at >= from);
    if (to) filtered = filtered.filter(d => d.diagnosed_at <= to);
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter(d => [d.company_name, d.owner, d.pains, d.initiatives, d.impact_note].join(' ').toLowerCase().includes(ql));
    }
    res.json({ data: filtered, isMock: true });
  });

  app.post('/api/diagnosis', (req, res) => {
    const body = req.body;
    const now = new Date().toISOString().split('T')[0];
    const newRow: DiagnosisRow = {
      id: generateId(), diagnosed_at: body.diagnosed_at || now,
      company_name: body.company_name || '', industry: body.industry || '',
      employee_size: body.employee_size || '', source: body.source || 'other',
      owner: body.owner || '', route: body.route || 'dispatch',
      status: body.status || 'diagnosed',
      pains: typeof body.pains === 'string' ? body.pains : JSON.stringify(body.pains || []),
      initiatives: typeof body.initiatives === 'string' ? body.initiatives : JSON.stringify(body.initiatives || []),
      impact_note: body.impact_note || '', next_action_text: body.next_action_text || '',
      next_action_due: body.next_action_due || '',
      links: typeof body.links === 'string' ? body.links : JSON.stringify(body.links || []),
      updated_at: now,
    };
    MOCK_DIAGNOSES.push(newRow);
    res.json({ success: true, data: newRow, isMock: true });
  });

  app.get('/api/diagnosis/:id', (req, res) => {
    const found = MOCK_DIAGNOSES.find(d => d.id === req.params.id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ data: found, isMock: true });
  });

  app.put('/api/diagnosis/:id', (req, res) => {
    const idx = MOCK_DIAGNOSES.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString().split('T')[0];
    const body = req.body;
    MOCK_DIAGNOSES[idx] = {
      ...MOCK_DIAGNOSES[idx], ...body, id: req.params.id,
      pains: typeof body.pains === 'string' ? body.pains : JSON.stringify(body.pains || []),
      initiatives: typeof body.initiatives === 'string' ? body.initiatives : JSON.stringify(body.initiatives || []),
      links: typeof body.links === 'string' ? body.links : JSON.stringify(body.links || []),
      updated_at: now,
    };
    res.json({ success: true, data: MOCK_DIAGNOSES[idx], isMock: true });
  });

  app.delete('/api/diagnosis/:id', (req, res) => {
    const idx = MOCK_DIAGNOSES.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    MOCK_DIAGNOSES.splice(idx, 1);
    res.json({ success: true, isMock: true });
  });

  // --- Analytics API ---

  app.get('/api/analytics', (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    let filtered = [...MOCK_DIAGNOSES];
    if (from) filtered = filtered.filter(d => d.diagnosed_at >= from);
    if (to) filtered = filtered.filter(d => d.diagnosed_at <= to);

    res.json({
      data: {
        total: filtered.length,
        diagnosed_count: filtered.filter(d => isStatusAtLeast(d.status, 'diagnosed')).length,
        proposed_count: filtered.filter(d => isStatusAtLeast(d.status, 'proposed')).length,
        quoted_count: filtered.filter(d => isStatusAtLeast(d.status, 'quoted')).length,
        won_count: filtered.filter(d => isStatusAtLeast(d.status, 'won')).length,
        case_published_count: filtered.filter(d => d.status === 'case_published').length,
        lost_count: filtered.filter(d => d.status === 'lost').length,
        on_hold_count: filtered.filter(d => d.status === 'on_hold').length,
        by_route: {
          dispatch: filtered.filter(d => d.route === 'dispatch').length,
          training: filtered.filter(d => d.route === 'training').length,
          aio: filtered.filter(d => d.route === 'aio').length,
        },
        by_source: {
          meetup: filtered.filter(d => d.source === 'meetup').length,
          sns: filtered.filter(d => d.source === 'sns').length,
          referral: filtered.filter(d => d.source === 'referral').length,
          other: filtered.filter(d => d.source === 'other').length,
        },
      },
      isMock: true,
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
