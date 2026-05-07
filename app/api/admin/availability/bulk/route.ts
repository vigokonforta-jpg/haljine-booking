import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SlotInput = { date: string; startHour: number; maxSpots: number };

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { slots?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const slots = body.slots as SlotInput[];
    if (!Array.isArray(slots) || slots.length === 0) {
      return Response.json({ error: "slots array required" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const validSlots = slots.filter((slot) => slot.date >= today);
    const pastIgnored = slots.length - validSlots.length;

    const result = await prisma.availabilitySlot.createMany({
      data: validSlots.map((slot) => ({
        date: slot.date,
        startHour: Number(slot.startHour),
        maxSpots: Number(slot.maxSpots),
      })),
      skipDuplicates: true,
    });

    return Response.json({
      added: result.count,
      skipped: validSlots.length - result.count,
      pastIgnored,
      errors: [],
    });
  } catch {
    return Response.json({ error: "Failed to add slots" }, { status: 500 });
  }
}
