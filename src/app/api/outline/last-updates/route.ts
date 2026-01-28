import { NextRequest, NextResponse } from "next/server";
import { getOutlineClient } from "@/lib/outline";

// GET /api/outline/last-updates?userId=xxx - Last 5 documents updated by this Outline user (across all collections)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter required" },
      { status: 400 }
    );
  }

  try {
    const client = getOutlineClient();
    const updates = await client.getLastDocumentsUpdatedByUserAcrossAllCollections(userId, 5);
    return NextResponse.json(updates);
  } catch (error) {
    console.error("Outline last-updates error:", error);
    return NextResponse.json(
      { error: "Konnte letzte Wiki-Updates nicht laden." },
      { status: 500 }
    );
  }
}
