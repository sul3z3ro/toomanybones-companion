import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID as string;
    const range = 'Sheet1!A:A'; // <<-- เปลี่ยนตรงนี้!

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const emails = (result.data.values || []).flat().map((e: string) => e.trim().toLowerCase());
    if (emails.includes(email.trim().toLowerCase())) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(403).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
    }
  } catch (err) {
  console.error('Google API Error:', err);
  return res.status(500).json({
    success: false,
    message: 'Server Error',
    error: err instanceof Error ? err.message : String(err),
  });
}
}
