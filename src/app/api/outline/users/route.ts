import { NextResponse } from "next/server";
import { getOutlineClient } from "@/lib/outline";

// GET /api/outline/users - Get all users from Outline
export async function GET() {
  try {
    const client = getOutlineClient();
    const users = await client.getUsers();

    return NextResponse.json({
      users,
    });
  } catch (error) {
    console.error("Outline API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Outline users", users: [] },
      { status: 500 }
    );
  }
}
