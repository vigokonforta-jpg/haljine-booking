import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUTC = new Date().toISOString().slice(0, 10);
  const nowISO = new Date().toISOString();

  let totalSlots = 0;
  let uniqueDates: string[] = [];
  let futureSlots: { date: string; count: number }[] = [];
  let pastSlots: { date: string; count: number }[] = [];
  let dbError: string | null = null;

  try {
    const allSlots = await prisma.availabilitySlot.findMany({
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
      select: { id: true, date: true, startHour: true },
    });

    totalSlots = allSlots.length;
    uniqueDates = [...new Set(allSlots.map((s) => s.date))].sort();

    // Group into future vs past
    const dateCountMap: Record<string, number> = {};
    for (const s of allSlots) {
      dateCountMap[s.date] = (dateCountMap[s.date] ?? 0) + 1;
    }
    for (const [date, count] of Object.entries(dateCountMap).sort()) {
      if (date >= todayUTC) {
        futureSlots.push({ date, count });
      } else {
        pastSlots.push({ date, count });
      }
    }
  } catch (err) {
    dbError = String(err);
  }

  return Response.json({
    serverTimeUTC: nowISO,
    todayUTC,
    totalSlots,
    uniqueDateCount: uniqueDates.length,
    futureSlotsCount: futureSlots.reduce((sum, d) => sum + d.count, 0),
    pastSlotsCount: pastSlots.reduce((sum, d) => sum + d.count, 0),
    futureDates: futureSlots,
    pastDates: pastSlots,
    dbError,
  });
}
