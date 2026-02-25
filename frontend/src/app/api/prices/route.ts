import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4020";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/test/data`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(data.prices || []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}