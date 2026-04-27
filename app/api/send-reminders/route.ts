import prisma from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { isAuthenticated } from "@/lib/auth";

// POST /api/send-reminders
// Call this daily (e.g. via cron) to send 24h-before reminders
export async function POST(request: Request) {
  // Require either admin auth or a secret token
  const secret = request.headers.get("x-reminder-secret");
  const isAdmin = await isAuthenticated();
  if (!isAdmin && secret !== process.env.REMINDER_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Find all upcoming bookings that haven't been reminded yet.
  // Using gte:today so manual triggers from the admin panel catch all upcoming slots,
  // not just those exactly 24h away.
  const bookings = await prisma.booking.findMany({
    where: {
      reminderSent: false,
      availabilitySlot: { date: { gte: today } },
    },
    include: { availabilitySlot: true },
  });

  let sent = 0;
  for (const booking of bookings) {
    try {
      await sendReminderEmail(
        booking.email,
        booking.name,
        booking.availabilitySlot.date,
        booking.availabilitySlot.startHour
      );
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSent: true },
      });
      sent++;
    } catch {
      // continue sending others even if one fails
    }
  }

  return Response.json({ sent });
}
