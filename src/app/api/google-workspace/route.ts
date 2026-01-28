import { NextResponse } from "next/server";
import { getGoogleWorkspaceClient } from "@/lib/google-workspace";

// GET /api/google-workspace - Test connection and get info
export async function GET() {
  try {
    const client = getGoogleWorkspaceClient();
    const result = await client.testConnection();

    if (result.success) {
      return NextResponse.json({
        connected: true,
        domain: result.domain,
      });
    } else {
      return NextResponse.json(
        { connected: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        connected: false, 
        error: error instanceof Error ? error.message : "Unbekannter Fehler" 
      },
      { status: 500 }
    );
  }
}
