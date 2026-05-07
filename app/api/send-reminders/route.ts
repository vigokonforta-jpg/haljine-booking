import prisma from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { isAuthenticated } from "@/lib/auth";
import { runCleanup } from "@/app/api/admin/cleanup/route";

// POST /api/send-reminders
// Call this daily (e.g. via cron) to send 24h-before reminders
export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-reminder-secret");
    const reminderSecret = process.env.REMINDER_SECRET;
    const isAdmin = await isAuthenticated();
    if (!isAdmin && (!reminderSecret || secret !== reminderSecret)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const bookings = await prisma.booking.findMany({
      where: {
        reminderSent: false,
        availabilitySlot: { date: { gte: today } },
      },
      include: { availabilitySlot: true },
    });

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
        // Continue sending others even if one email fails.
      }
    }

    if (sentIds.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: sentIds } },
        data: { reminderSent: true },
      });
    }

    const cleaned = await runCleanup().catch(() => 0);

    return Response.json({ sent: sentIds.length, cleaned });
  } catch {
    return Response.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
