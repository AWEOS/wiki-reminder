import { NextRequest, NextResponse } from "next/server";
import { getGoogleWorkspaceClient } from "@/lib/google-workspace";
import { prisma } from "@/lib/db";

// GET /api/google-workspace/users - Get all users from Google Workspace
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgUnitPath = searchParams.get("orgUnitPath") || undefined;
    const query = searchParams.get("query") || undefined;

    const client = getGoogleWorkspaceClient();
    const users = await client.getUsers({ orgUnitPath, query });

    // Get unique OUs for filtering
    const orgUnits = [...new Set(users.map((u) => u.orgUnitPath))].sort();

    // Stats
    const stats = {
      total: users.length,
      active: users.filter((u) => !u.suspended).length,
      suspended: users.filter((u) => u.suspended).length,
      admins: users.filter((u) => u.isAdmin && !u.suspended).length,
    };

    return NextResponse.json({
      stats,
      orgUnits,
      users,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}

// POST /api/google-workspace/users - Import/sync users to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userEmails,  // Optional: specific emails to import
      orgUnitPath, // Optional: filter by OU
      replaceExisting = false, // Replace existing users or skip
    } = body;

    const client = getGoogleWorkspaceClient();
    let users = await client.getUsers({ orgUnitPath });

    // Filter to specific emails if provided
    if (userEmails && userEmails.length > 0) {
      const emailSet = new Set(userEmails.map((e: string) => e.toLowerCase()));
      users = users.filter((u) => emailSet.has(u.email.toLowerCase()));
    }

    // Filter out suspended users
    users = users.filter((u) => !u.suspended);

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      try {
        const existingUser = await prisma.teamLeader.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          if (replaceExisting) {
            await prisma.teamLeader.update({
              where: { email: user.email },
              data: {
                name: user.name,
                // Keep existing googleChatId if not empty
                googleChatId: existingUser.googleChatId || undefined,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await prisma.teamLeader.create({
            data: {
              name: user.name,
              email: user.email,
              active: true,
            },
          });
          results.imported++;
        }
      } catch (err) {
        results.errors.push(
          `${user.email}: ${err instanceof Error ? err.message : "Fehler"}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
