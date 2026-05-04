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

  console.log("[bulk] RAW BODY:", JSON.stringify(body));

  const slots = body.slots as SlotInput[];

  if (!Array.isArray(slots) || slots.length === 0) {
    console.log("[bulk] ERROR: slots missing or empty, body.slots type =", typeof body.slots);
    return Response.json({ error: "slots array required" }, { status: 400 });
  }

  console.log("[bulk] slots.length =", slots.length);
  const uniqueDates = [...new Set(slots.map((s) => s.date))].sort();
  console.log("[bulk] unique dates (" + uniqueDates.length + ") =", uniqueDates);
  console.log("[bulk] all slots (date@hour) =", slots.map((s) => `${s.date}@${s.startHour}`).join(", "));

  let added = 0;
  let skipped = 0;

  await Promise.all(
    slots.map(async (s) => {
      console.log("[bulk] creating slot:", s.date, "hour:", s.startHour, "maxSpots:", s.maxSpots);
      try {
        await prisma.availabilitySlot.create({
          data: {
            date: s.date,
            startHour: Number(s.startHour),
            maxSpots: Number(s.maxSpots),
          },
        });
        console.log("[bulk] OK:", s.date, "hour:", s.startHour);
        added++;
      } catch (err) {
        console.log("[bulk] SKIP (exists):", s.date, "hour:", s.startHour, String(err));
        skipped++;
      }
    })
  );

  console.log("[bulk] DONE — added:", added, "skipped:", skipped);
  return Response.json({ added, skipped });
}
