import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/email";

// POST /api/bookings
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, slotId, people } = body as {
    name: string;
    email: string;
    phone: string;
    slotId: number;
    people?: number;
  };

  if (!name || !email || !phone || !slotId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const peopleCount = Math.min(Math.max(Number(people) || 1, 1), 2);

  // Check cancellation limit before transaction
  const limitRecord = await prisma.bookingLimit.findUnique({ where: { email } });
  if (limitRecord && limitRecord.cancelCount >= 2) {
    return Response.json(
      { error: "Dostigli ste maksimalan broj otkazivanja (2). Za rezervaciju kontaktirajte nas izravno." },
      { status: 429 }
    );
  }

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      // Weekly booking limit: max 1 booking per 7 days per email
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentCount = await tx.booking.count({
        where: { email, createdAt: { gte: weekAgo } },
      });
      if (recentCount >= 1) {
        const err = new Error("Weekly limit reached");
        (err as NodeJS.ErrnoException).code = "WEEKLY_LIMIT";
        throw err;
      }

      const slot = await tx.availabilitySlot.findUnique({
        where: { id: slotId },
        include: { bookings: { select: { people: true } } },
      });

      if (!slot) {
        const err = new Error("Slot not found");
        (err as NodeJS.ErrnoException).code = "NOT_FOUND";
        throw err;
      }

      const usedSpots = slot.bookings.reduce((sum, b) => sum + b.people, 0);
      if (usedSpots + peopleCount > slot.maxSpots) {
        const err = new Error("Slot is fully booked");
        (err as NodeJS.ErrnoException).code = "FULL";
        throw err;
      }

      return tx.booking.create({
        data: { name, email, phone, people: peopleCount, availabilitySlotId: slotId },
        include: { availabilitySlot: true },
      });
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "NOT_FOUND") return Response.json({ error: "Termin nije pronađen" }, { status: 404 });
    if (code === "FULL") return Response.json({ error: "Termin je popunjen" }, { status: 409 });
    if (code === "WEEKLY_LIMIT") return Response.json(
      { error: "Možete napraviti samo jednu rezervaciju tjedno. Pokušajte ponovo za 7 dana." },
      { status: 429 }
    );
    throw err;
  }

  let emailSent = false;
  try {
    await sendConfirmationEmail(email, name, booking.availabilitySlot.date, booking.availabilitySlot.startHour);
    emailSent = true;
  } catch {
    // Don't fail the booking if email fails
  }

  return Response.json(
    {
      id: booking.id,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      people: booking.people,
      availabilitySlotId: booking.availabilitySlotId,
      reminderSent: booking.reminderSent,
      createdAt: booking.createdAt,
      emailSent,
    },
    { status: 201 }
  );
}
