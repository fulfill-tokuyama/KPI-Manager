export interface EventRow {
  id: string;
  event_date: string;
  event_name: string;
  cost_yen: string;
  contacts_count: string;
  appointments_count: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const MOCK_EVENTS: EventRow[] = [
  {
    id: 'e001', event_date: '2024-01-10', event_name: 'AI活用経営者交流会',
    cost_yen: '5000', contacts_count: '8', appointments_count: '2',
    notes: '名刺交換8枚、うち2件アポ確定', created_at: '2024-01-10', updated_at: '2024-01-10',
  },
  {
    id: 'e002', event_date: '2024-01-18', event_name: 'DX推進ビジネスミートアップ',
    cost_yen: '3000', contacts_count: '5', appointments_count: '1',
    notes: '', created_at: '2024-01-18', updated_at: '2024-01-18',
  },
  {
    id: 'e003', event_date: '2024-01-25', event_name: 'スタートアップ交流会',
    cost_yen: '8000', contacts_count: '12', appointments_count: '3',
    notes: 'VCも参加、良い接点多数', created_at: '2024-01-25', updated_at: '2024-01-25',
  },
  {
    id: 'e004', event_date: '2024-02-05', event_name: '製造業DXセミナー懇親会',
    cost_yen: '4000', contacts_count: '6', appointments_count: '0',
    notes: '名刺交換のみ', created_at: '2024-02-05', updated_at: '2024-02-05',
  },
  {
    id: 'e005', event_date: '2026-03-01', event_name: 'IT経営者朝活',
    cost_yen: '2000', contacts_count: '4', appointments_count: '1',
    notes: '', created_at: '2026-03-01', updated_at: '2026-03-01',
  },
];

export const EVENT_SHEET_COLUMNS = [
  'id', 'event_date', 'event_name', 'cost_yen', 'contacts_count',
  'appointments_count', 'notes', 'created_at', 'updated_at',
] as const;
