import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4020";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/test/data`, {
      next: { revalidate: 10 },
    });
    const data = await res.json();
    return NextResponse.json(data.earnings || {
      totalEarned: 0,
      earnedToday: 0,
      totalCalls: 0,
      callsToday: 0,
      entries: [],
    });
  } catch {
    return NextResponse.json({
      totalEarned: 0,
      earnedToday: 0,
      totalCalls: 0,
      callsToday: 0,
      entries: [],
    });
  }
}