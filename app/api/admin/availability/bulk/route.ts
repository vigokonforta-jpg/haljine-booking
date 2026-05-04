import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SlotInput = { date: string; startHour: number; maxSpots: number };

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const slots = body.slots as SlotInput[];

  if (!Array.isArray(slots) || slots.length === 0) {
    return Response.json({ error: "slots array required" }, { status: 400 });
  }

  const uniqueDates = [...new Set(slots.map((s) => s.date))].sort();
  console.log("[bulk] received", slots.length, "slots for", uniqueDates.length, "dates:", uniqueDates);

  const result = await prisma.availabilitySlot.createMany({
    data: slots.map((s) => ({
      date: s.date,
      startHour: Number(s.startHour),
      maxSpots: Number(s.maxSpots),
    })),
    skipDuplicates: true,
  });

  console.log("[bulk] created", result.count, "— skipped", slots.length - result.count);

  return Response.json({ added: result.count, skipped: slots.length - result.count });
}
