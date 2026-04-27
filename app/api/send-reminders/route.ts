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

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const bookings = await prisma.booking.findMany({
    where: {
      reminderSent: false,
      availabilitySlot: { date: tomorrowDate },
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
