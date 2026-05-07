import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/settings - public, returns current site instructions
export async function GET() {
  try {
    const settings = await getSiteSettings();
    return Response.json(
      { instructions: settings.instructions },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch {
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
