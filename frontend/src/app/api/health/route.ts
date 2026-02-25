import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4020";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/health`, {
      next: { revalidate: 10 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "offline" }, { status: 200 });
  }
}