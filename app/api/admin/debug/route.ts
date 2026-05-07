import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayUTC = new Date().toISOString().slice(0, 10);
    const nowISO = new Date().toISOString();

    const allSlots = await prisma.availabilitySlot.findMany({
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
      select: { id: true, date: true, startHour: true },
    });

    const uniqueDates = [...new Set(allSlots.map((slot) => slot.date))].sort();
    const futureSlots: { date: string; count: number }[] = [];
    const pastSlots: { date: string; count: number }[] = [];
    const dateCountMap: Record<string, number> = {};

    for (const slot of allSlots) {
      dateCountMap[slot.date] = (dateCountMap[slot.date] ?? 0) + 1;
    }

    for (const [date, count] of Object.entries(dateCountMap).sort()) {
      if (date >= todayUTC) {
        futureSlots.push({ date, count });
      } else {
        pastSlots.push({ date, count });
      }
    }

    return Response.json({
      serverTimeUTC: nowISO,
      todayUTC,
      totalSlots: allSlots.length,
      uniqueDateCount: uniqueDates.length,
      futureSlotsCount: futureSlots.reduce((sum, day) => sum + day.count, 0),
      pastSlotsCount: pastSlots.reduce((sum, day) => sum + day.count, 0),
      futureDates: futureSlots,
      pastDates: pastSlots,
      dbError: null,
    });
  } catch (err) {
    return Response.json(
      {
        error: "Failed to fetch debug data",
        dbError: String(err),
      },
      { status: 500 }
    );
  }
}
