import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // read runs.json directly from backend data folder
    const runsPath = path.join(process.cwd(), "..", "data", "runs.json");
    if (!fs.existsSync(runsPath)) {
      return NextResponse.json([]);
    }
    const raw = fs.readFileSync(runsPath, "utf-8");
    const runs = JSON.parse(raw);
    return NextResponse.json(runs.slice(0, 20));
  } catch {
    return NextResponse.json([]);
  }
}