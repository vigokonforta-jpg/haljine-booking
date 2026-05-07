import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/email";

// POST /api/bookings
export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    slotId?: number;
    people?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, phone, slotId, people } = body;
  if (!name || !email || !phone || !slotId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const peopleCount = Math.min(Math.max(Number(people) || 1, 1), 2);

  try {
    const limitRecord = await prisma.bookingLimit.findUnique({ where: { email } });
    if (limitRecord && limitRecord.cancelCount >= 2) {
      return Response.json(
        { error: "Dostigli ste maksimalan broj otkazivanja (2). Za rezervaciju kontaktirajte nas izravno." },
        { status: 429 }
      );
    }

    const booking = await prisma.$transaction(async (tx) => {
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

      const usedSpots = slot.bookings.reduce((sum, booking) => sum + booking.people, 0);
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

    let emailSent = false;
    try {
      await sendConfirmationEmail(email, name, booking.availabilitySlot.date, booking.availabilitySlot.startHour);
      emailSent = true;
    } catch {
      // Don't fail the booking if email fails.
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
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "NOT_FOUND") {
      return Response.json({ error: "Termin nije pronaÄ‘en" }, { status: 404 });
    }
    if (code === "FULL") {
      return Response.json({ error: "Termin je popunjen" }, { status: 409 });
    }
    if (code === "WEEKLY_LIMIT") {
      return Response.json(
        { error: "MoÅ¾ete napraviti samo jednu rezervaciju tjedno. PokuÅ¡ajte ponovo za 7 dana." },
        { status: 429 }
      );
    }
    return Response.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
