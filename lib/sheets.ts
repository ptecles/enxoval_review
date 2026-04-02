import { google } from "googleapis";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getSpreadsheetId(): string {
  return getEnv("GOOGLE_SHEET_ID");
}

export function getTabNameStrollers(): string {
  return process.env.SHEETS_TAB_STROLLERS || "strollers";
}

export function getTabNameReviews(): string {
  return process.env.SHEETS_TAB_REVIEWS || "reviews";
}

export async function getSheetsClient() {
  const email = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key = getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}
