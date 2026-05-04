import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/bookings — list all upcoming bookings
export async function GET() {
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
    bookings.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      people: b.people,
      date: b.availabilitySlot.date,
      startHour: b.availabilitySlot.startHour,
      createdAt: b.createdAt,
    }))
  );
}
