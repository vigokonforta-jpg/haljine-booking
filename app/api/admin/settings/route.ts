import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { getSiteSettings, DEFAULT_CONTACT } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const s = await getSiteSettings();
    return Response.json({
      instructions: s.instructions,
      contactEmail: s.contactEmail,
      contactAddress: s.contactAddress,
      contactPhone: s.contactPhone,
    });
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
    const body = await request.json() as {
      instructions?: string;
      contactEmail?: string;
      contactAddress?: string;
      contactPhone?: string;
    };
    const data = {
      instructions: body.instructions ?? "",
      contactEmail: body.contactEmail ?? DEFAULT_CONTACT.contactEmail,
      contactAddress: body.contactAddress ?? DEFAULT_CONTACT.contactAddress,
      contactPhone: body.contactPhone ?? DEFAULT_CONTACT.contactPhone,
    };
    const s = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return Response.json({
      instructions: s.instructions,
      contactEmail: s.contactEmail,
      contactAddress: s.contactAddress,
      contactPhone: s.contactPhone,
    });
  } catch {
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
