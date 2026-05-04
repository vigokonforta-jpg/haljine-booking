import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SlotInput = { date: string; startHour: number; maxSpots: number };

export async function POST(request: NextRequest) {
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

  const uniqueDates = [...new Set(slots.map((s) => s.date))].sort();
  console.log("[bulk] received", slots.length, "slots for", uniqueDates.length, "dates:", uniqueDates);

  let added = 0;
  let skipped = 0;

  // Run all creates in parallel — individual catches handle unique-constraint violations
  await Promise.all(
    slots.map(async (s) => {
      try {
        await prisma.availabilitySlot.create({
          data: {
            date: s.date,
            startHour: Number(s.startHour),
            maxSpots: Number(s.maxSpots),
          },
        });
        added++;
      } catch {
        skipped++; // unique constraint = slot already exists for that date/hour
      }
    })
  );

  console.log("[bulk] created", added, "— skipped", skipped);
  return Response.json({ added, skipped });
}
