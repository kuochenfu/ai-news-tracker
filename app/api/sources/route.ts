import { NextResponse } from "next/server";

import { sourceStatuses } from "@/src/mockData";

export function GET() {
  return NextResponse.json({ sources: sourceStatuses });
}

