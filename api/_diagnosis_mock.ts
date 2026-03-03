export interface DiagnosisRow {
  id: string;
  diagnosed_at: string;
  company_name: string;
  industry: string;
  employee_size: string;
  source: string;
  owner: string;
  route: string;
  status: string;
  pains: string;
  initiatives: string;
  impact_note: string;
  next_action_text: string;
  next_action_due: string;
  links: string;
  updated_at: string;
}

export const MOCK_DIAGNOSES: DiagnosisRow[] = [
  {
    id: 'd001', diagnosed_at: '2024-01-10', company_name: '株式会社テスト',
    industry: 'IT', employee_size: '50-100', source: 'meetup', owner: '田中',
    route: 'dispatch', status: 'won', pains: '["人手不足","DX推進"]',
    initiatives: '["AI活用研修","業務自動化"]', impact_note: '月20時間削減見込み',
    next_action_text: '契約書送付', next_action_due: '2024-02-01',
    links: '["https://example.com/proposal"]', updated_at: '2024-01-15',
  },
  {
    id: 'd002', diagnosed_at: '2024-01-15', company_name: '合同会社サンプル',
    industry: '製造', employee_size: '100-300', source: 'referral', owner: '鈴木',
    route: 'training', status: 'proposed', pains: '["品質管理","コスト削減"]',
    initiatives: '["検査AI導入","工程最適化"]', impact_note: '不良率50%低減',
    next_action_text: '見積提出', next_action_due: '2024-01-25',
    links: '[]', updated_at: '2024-01-18',
  },
  {
    id: 'd003', diagnosed_at: '2024-01-20', company_name: 'ABC商事',
    industry: '小売', employee_size: '10-50', source: 'sns', owner: '田中',
    route: 'aio', status: 'diagnosed', pains: '["在庫管理","売上予測"]',
    initiatives: '["需要予測AI","在庫自動発注"]', impact_note: '在庫回転率30%改善',
    next_action_text: '提案資料作成', next_action_due: '2024-02-05',
    links: '[]', updated_at: '2024-01-20',
  },
  {
    id: 'd004', diagnosed_at: '2023-12-01', company_name: 'XYZコンサルティング',
    industry: 'コンサル', employee_size: '10-50', source: 'meetup', owner: '鈴木',
    route: 'dispatch', status: 'case_published', pains: '["営業効率","顧客分析"]',
    initiatives: '["CRM AI化","営業支援ツール"]', impact_note: '売上15%向上',
    next_action_text: '', next_action_due: '',
    links: '["https://example.com/case-study"]', updated_at: '2024-01-05',
  },
  {
    id: 'd005', diagnosed_at: '2024-01-08', company_name: 'フューチャー建設',
    industry: '建設', employee_size: '300+', source: 'meetup', owner: '田中',
    route: 'training', status: 'quoted', pains: '["安全管理","人材育成"]',
    initiatives: '["安全AI監視","研修プログラム"]', impact_note: '事故率低減',
    next_action_text: 'クロージング面談', next_action_due: '2024-02-10',
    links: '["https://example.com/quote"]', updated_at: '2024-01-22',
  },
  {
    id: 'd006', diagnosed_at: '2023-11-15', company_name: 'メディカルプラス',
    industry: '医療', employee_size: '50-100', source: 'referral', owner: '鈴木',
    route: 'aio', status: 'in_progress', pains: '["事務効率","予約管理"]',
    initiatives: '["予約AI","電子カルテ連携"]', impact_note: '受付時間60%短縮',
    next_action_text: '月次レビュー', next_action_due: '2024-02-15',
    links: '[]', updated_at: '2024-01-10',
  },
];

export const DIAGNOSIS_SHEET_COLUMNS = [
  'id', 'diagnosed_at', 'company_name', 'industry', 'employee_size',
  'source', 'owner', 'route', 'status', 'pains', 'initiatives',
  'impact_note', 'next_action_text', 'next_action_due', 'links', 'updated_at',
] as const;
