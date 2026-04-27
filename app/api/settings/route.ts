import prisma from "@/lib/prisma";

// GET /api/settings — public, returns current site instructions
export async function GET() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, instructions: "" },
  });
  return Response.json({ instructions: settings.instructions });
}
