import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/bookings/my?email=xxx@xxx.com
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return Response.json({ error: "Email je obavezan" }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const bookings = await prisma.booking.findMany({
      where: {
        email,
        availabilitySlot: { date: { gte: today } },
      },
      include: { availabilitySlot: true },
      orderBy: [
        { availabilitySlot: { date: "asc" } },
        { availabilitySlot: { startHour: "asc" } },
      ],
    });

    return Response.json(
      bookings.map((b) => ({
        id: b.id,
        date: b.availabilitySlot.date,
        startHour: b.availabilitySlot.startHour,
        people: b.people,
        createdAt: b.createdAt,
      }))
    );
  } catch {
    return Response.json({ error: "Greška pri dohvatu rezervacija" }, { status: 500 });
  }
}
