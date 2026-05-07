import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSiteSettings();
    return Response.json({ instructions: settings.instructions });
  } catch {
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { instructions?: string };
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { instructions: body.instructions ?? "" },
      create: { id: 1, instructions: body.instructions ?? "" },
    });
    return Response.json({ instructions: settings.instructions });
  } catch {
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
