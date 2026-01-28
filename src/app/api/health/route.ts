// GET /api/health - Öffentlicher Endpoint für Load-Balancer und Docker HEALTHCHECK (keine sensiblen Daten)
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
