import { NextResponse } from 'next/server';

// Expenses table not yet implemented
export async function GET() {
  return NextResponse.json({ expenses: [] });
}
