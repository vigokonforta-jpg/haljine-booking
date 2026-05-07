import { isAuthenticated } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number(id);

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.bookingLimit.upsert({
        where: { email: booking.email },
        create: { email: booking.email, cancelCount: 1 },
        update: { cancelCount: { increment: 1 } },
      }),
      prisma.booking.delete({ where: { id: bookingId } }),
    ]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
