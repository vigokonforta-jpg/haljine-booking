import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/email";

// POST /api/bookings
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, slotId } = body as {
    name: string;
    email: string;
    phone: string;
    slotId: number;
  };

  if (!name || !email || !phone || !slotId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: slotId },
        include: { _count: { select: { bookings: true } } },
      });

      if (!slot) {
        const err = new Error("Slot not found");
        (err as NodeJS.ErrnoException).code = "NOT_FOUND";
        throw err;
      }

      if (slot._count.bookings >= slot.maxSpots) {
        const err = new Error("Slot is fully booked");
        (err as NodeJS.ErrnoException).code = "FULL";
        throw err;
      }

      return tx.booking.create({
        data: { name, email, phone, availabilitySlotId: slotId },
        include: { availabilitySlot: true },
      });
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "NOT_FOUND") return Response.json({ error: "Termin nije pronađen" }, { status: 404 });
    if (code === "FULL") return Response.json({ error: "Termin je popunjen" }, { status: 409 });
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
      availabilitySlotId: booking.availabilitySlotId,
      reminderSent: booking.reminderSent,
      createdAt: booking.createdAt,
      emailSent,
    },
    { status: 201 }
  );
}
