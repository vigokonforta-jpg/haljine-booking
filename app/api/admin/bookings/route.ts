import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/bookings - list all upcoming bookings
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const bookings = await prisma.booking.findMany({
      where: { availabilitySlot: { date: { gte: today } } },
      include: { availabilitySlot: true },
      orderBy: [
        { availabilitySlot: { date: "asc" } },
        { availabilitySlot: { startHour: "asc" } },
      ],
    });

    return Response.json(
      bookings.map((booking) => ({
        id: booking.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        people: booking.people,
        date: booking.availabilitySlot.date,
        startHour: booking.availabilitySlot.startHour,
        createdAt: booking.createdAt,
      }))
    );
  } catch {
    return Response.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
