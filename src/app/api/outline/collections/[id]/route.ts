import { NextRequest, NextResponse } from "next/server";
import { getOutlineClient } from "@/lib/outline";

// GET /api/outline/collections/[id] - Get collection details and recent documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getOutlineClient();
    
    const collection = await client.getCollection(id);
    const documents = await client.getDocumentsInCollection(id);

    return NextResponse.json({
      collection,
      documents,
    });
  } catch (error) {
    console.error("Outline API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}
