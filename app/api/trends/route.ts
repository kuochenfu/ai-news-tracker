import { NextResponse } from "next/server";

import { trends } from "@/src/mockData";

export function GET() {
  return NextResponse.json({ trends });
}

