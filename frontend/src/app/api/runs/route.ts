import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4020";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/test/data`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    // extract runs from test/data or return empty
    return NextResponse.json(data.runs || []);
  } catch {
    return NextResponse.json([]);
  }
}
