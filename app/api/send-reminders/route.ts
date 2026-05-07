import prisma from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { isAuthenticated } from "@/lib/auth";
import { runCleanup } from "@/app/api/admin/cleanup/route";

// POST /api/send-reminders
// Call this daily (e.g. via cron) to send 24h-before reminders
export async function POST(request: Request) {
  // Require either admin auth or a valid secret token.
  // If REMINDER_SECRET is not set, only admin session auth is accepted.
  const secret = request.headers.get("x-reminder-secret");
  const reminderSecret = process.env.REMINDER_SECRET;
  const isAdmin = await isAuthenticated();
  if (!isAdmin && (!reminderSecret || secret !== reminderSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Find all upcoming bookings that haven't been reminded yet.
  const bookings = await prisma.booking.findMany({
    where: {
      reminderSent: false,
      availabilitySlot: { date: { gte: today } },
    },
    include: { availabilitySlot: true },
  });

  // Send emails, collect IDs of successful sends
  const sentIds: number[] = [];
  for (const booking of bookings) {
    try {
      await sendReminderEmail(
        booking.email,
        booking.name,
        booking.availabilitySlot.date,
        booking.availabilitySlot.startHour
      );
      sentIds.push(booking.id);
    } catch {
      // continue sending others even if one fails
    }
  }

  // Batch update all successfully sent bookings in a single query
  if (sentIds.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: sentIds } },
      data: { reminderSent: true },
    });
  }

  // Run daily cleanup of slots/bookings older than 30 days
  const cleaned = await runCleanup().catch(() => 0);

  return Response.json({ sent: sentIds.length, cleaned });
}
