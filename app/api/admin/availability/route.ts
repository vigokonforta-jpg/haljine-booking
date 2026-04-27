import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

// GET /api/admin/availability — list all upcoming slots
export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const slots = await prisma.availabilitySlot.findMany({
    where: { date: { gte: today } },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ date: "asc" }, { startHour: "asc" }],
  });

  return Response.json(
    slots.map((s) => ({
      id: s.id,
      date: s.date,
      startHour: s.startHour,
      maxSpots: s.maxSpots,
      booked: s._count.bookings,
    }))
  );
}

// POST /api/admin/availability — create a slot
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, startHour, maxSpots } = await request.json();
  if (!date || startHour === undefined) {
    return Response.json({ error: "date and startHour required" }, { status: 400 });
  }

  try {
    const slot = await prisma.availabilitySlot.create({
      data: { date, startHour: Number(startHour), maxSpots: maxSpots ?? 3 },
    });
    return Response.json(slot, { status: 201 });
  } catch {
    return Response.json({ error: "Slot already exists for that date/hour" }, { status: 409 });
  }
}
