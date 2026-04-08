import { NextResponse } from "next/server";
import { listStrollers } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const strollers = await listStrollers();
    
    return NextResponse.json({
      success: true,
      count: strollers.length,
      timestamp: new Date().toISOString(),
      usingCsvUrl: !!process.env.STROLLERS_CSV_URL,
      hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      strollers: strollers.map(s => ({
        id: s.id,
        name: s.name,
        brand: s.brand,
        category: s.category
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
