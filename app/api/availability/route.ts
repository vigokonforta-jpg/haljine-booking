import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/availability?year=2025&month=4
// Returns slots with booking counts for the given month
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? ""); // 1-12

  if (isNaN(year) || isNaN(month)) {
    return Response.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ date: "asc" }, { startHour: "asc" }],
  });

  const result = slots.map((slot) => ({
    id: slot.id,
    date: slot.date,
    startHour: slot.startHour,
    maxSpots: slot.maxSpots,
    spotsLeft: slot.maxSpots - slot._count.bookings,
  }));

  return Response.json(result);
}
