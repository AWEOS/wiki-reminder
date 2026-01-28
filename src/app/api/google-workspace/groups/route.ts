import { NextResponse } from "next/server";
import { getGoogleWorkspaceClient } from "@/lib/google-workspace";

// GET /api/google-workspace/groups - Get all groups from Google Workspace
export async function GET() {
  try {
    const client = getGoogleWorkspaceClient();
    const groups = await client.getGroups();

    return NextResponse.json({
      total: groups.length,
      groups,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
