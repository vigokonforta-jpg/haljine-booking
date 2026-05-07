import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE /api/bookings/[id]?email=xxx@xxx.com
// Public cancellation endpoint — email used as identity verification.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return Response.json({ error: "Email je obavezan" }, { status: 400 });
  }

  const bookingId = Number(id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return Response.json({ error: "Neispravan ID rezervacije" }, { status: 400 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { availabilitySlot: true },
    });

    if (!booking || booking.email !== email) {
      return Response.json({ error: "Rezervacija nije pronađena" }, { status: 404 });
    }

    // Block cancellation within 24h of the slot
    const slotTime = new Date(
      `${booking.availabilitySlot.date}T${String(booking.availabilitySlot.startHour).padStart(2, "0")}:00:00`
    );
    const hoursUntil = (slotTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return Response.json(
        { error: "Nije moguće otkazati termin manje od 24 sata unaprijed. Kontaktirajte nas izravno." },
        { status: 400 }
      );
    }

    // Check cancel limit (max 2)
    const limit = await prisma.bookingLimit.findUnique({ where: { email } });
    if (limit && limit.cancelCount >= 2) {
      return Response.json(
        { error: "Dostigli ste maksimalan broj otkazivanja (2). Za pomoć kontaktirajte nas izravno." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.bookingLimit.upsert({
        where: { email },
        create: { email, cancelCount: 1 },
        update: { cancelCount: { increment: 1 } },
      }),
      prisma.booking.delete({ where: { id: bookingId } }),
    ]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Greška pri otkazivanju rezervacije" }, { status: 500 });
  }
}
