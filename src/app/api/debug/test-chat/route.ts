import { NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/google-chat";

// POST /api/debug/test-chat - Send a test Google Chat message
export async function POST() {
  try {
    const result = await sendTestNotification();

    if (result.success) {
      return NextResponse.json({ 
        success: true,
        message: "Test notification sent",
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test chat error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
