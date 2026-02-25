import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4020";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/balance/${address}`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}