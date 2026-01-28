import { NextResponse } from "next/server";
import { getOutlineClient } from "@/lib/outline";

// GET /api/outline - Test connection and get collections
export async function GET() {
  try {
    const client = getOutlineClient();
    
    // Test connection
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: "Outline API connection failed", details: connectionTest.error },
        { status: 500 }
      );
    }

    // Get collections
    const collections = await client.getCollections();

    return NextResponse.json({
      connected: true,
      collections,
    });
  } catch (error) {
    console.error("Outline API Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Outline API" },
      { status: 500 }
    );
  }
}
