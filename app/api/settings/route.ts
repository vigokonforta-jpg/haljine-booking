import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/settings - public, returns current site settings
export async function GET() {
  try {
    const s = await getSiteSettings();
    return Response.json(
      {
        instructions: s.instructions,
        contactEmail: s.contactEmail,
        contactAddress: s.contactAddress,
        contactPhone: s.contactPhone,
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch {
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
