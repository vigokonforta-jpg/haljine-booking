import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, instructions: "" },
  });
  return Response.json({ instructions: settings.instructions });
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { instructions } = await request.json() as { instructions: string };
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { instructions: instructions ?? "" },
    create: { id: 1, instructions: instructions ?? "" },
  });
  return Response.json({ instructions: settings.instructions });
}
