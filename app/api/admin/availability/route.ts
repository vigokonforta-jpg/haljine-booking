import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/availability - list ALL slots (past and future)
// Past slots are shown dimmed in the UI so admin can identify and delete ghost rows.
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slots = await prisma.availabilitySlot.findMany({
      include: { bookings: { select: { people: true } } },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
    });

    return Response.json(
      slots.map((slot) => ({
        id: slot.id,
        date: slot.date,
        startHour: slot.startHour,
        maxSpots: slot.maxSpots,
        booked: slot.bookings.reduce((sum, booking) => sum + booking.people, 0),
      }))
    );
  } catch {
    return Response.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

// POST /api/admin/availability - create a slot
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, startHour, maxSpots } = await request.json();
    if (!date || startHour === undefined) {
      return Response.json({ error: "date and startHour required" }, { status: 400 });
    }

    const slot = await prisma.availabilitySlot.create({
      data: { date, startHour: Number(startHour), maxSpots: maxSpots ?? 3 },
    });
    return Response.json(slot, { status: 201 });
  } catch (err) {
    const isUniqueViolation =
      typeof err === "object" && err !== null && "code" in err &&
      (err as { code: unknown }).code === "P2002";

    return Response.json(
      { error: isUniqueViolation ? "Slot already exists for that date/hour" : "Failed to create slot" },
      { status: isUniqueViolation ? 409 : 500 }
    );
  }
}
