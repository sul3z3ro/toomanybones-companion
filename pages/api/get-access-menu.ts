// /pages/api/get-access-menu.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const sheetMap = [
  { sheet: 'Too Many Bones', code: 'tmb', label: 'Too Many Bones' },
  { sheet: 'Too Many Bones: Undertow', code: 'tmbut', label: 'Too Many Bones: Undertow' },
  { sheet: 'Too Many Bones: Unbreakable', code: 'tmbub', label: 'Too Many Bones: Unbreakable' },
  { sheet: 'Expansion Characters', code: 'excha', label: 'Expansion Characters' },
  { sheet: 'Expansion Scenarios', code: 'exsce', label: 'Expansion Scenarios' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ menus: [] });

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID as string;

    // ดึงข้อมูลทุก sheet
    const results = await Promise.all(
      sheetMap.map(async (s) => {
        const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${s.sheet}!A:A`,
        });
        const emails = (result.data.values || []).flat().map((e: string) => e.trim().toLowerCase());
        return emails.includes(email.trim().toLowerCase()) ? s : null;
      })
    );
    // ส่งเฉพาะเมนูที่ user มีสิทธิ์
    const menus = results.filter(Boolean);
    res.status(200).json({ menus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ menus: [] });
  }
}
