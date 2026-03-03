import { google, type sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({ email, key, scopes: SCOPES });
}

export function getSpreadsheetId() {
  return process.env.GOOGLE_SHEET_ID || null;
}

/**
 * Try to get an authenticated Sheets client.
 * Returns null when credentials are missing or invalid so callers can fall back to mock data.
 */
export async function getSheetsClient(): Promise<{ sheets: sheets_v4.Sheets; spreadsheetId: string } | null> {
  const auth = getAuthClient();
  const spreadsheetId = getSpreadsheetId();
  if (!auth || !spreadsheetId) return null;

  try {
    await auth.authorize();
    return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
  } catch (err) {
    console.warn('Google Sheets auth failed, falling back to mock data:', (err as Error).message);
    return null;
  }
}
