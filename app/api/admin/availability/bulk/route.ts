import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
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

  const today = new Date().toISOString().slice(0, 10);
  console.log("[bulk] slots.length =", slots.length, "today =", today);
  const uniqueDates = [...new Set(slots.map((s) => s.date))].sort();
  console.log("[bulk] unique dates (" + uniqueDates.length + ") =", uniqueDates);

  let added = 0;
  let skipped = 0;
  let pastIgnored = 0;
  const errors: string[] = [];

  await Promise.all(
    slots.map(async (s) => {
      // Past-date slots are ghost rows — calendar prevents selecting them so
      // this guard only fires if stale DB rows match a date we can't show.
      if (s.date < today) {
        console.log("[bulk] PAST GHOST ignored:", s.date, "hour:", s.startHour);
        pastIgnored++;
        return;
      }
      console.log("[bulk] creating:", s.date, "hour:", s.startHour, "maxSpots:", s.maxSpots);
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
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (isUniqueViolation) {
          console.log("[bulk] SKIP (duplicate):", s.date, "hour:", s.startHour);
          skipped++;
        } else {
          // Real error — DB connection problem, schema mismatch, etc.
          const msg = `${s.date}@${s.startHour}: ${String(err)}`;
          console.error("[bulk] ERROR:", msg);
          errors.push(msg);
        }
      }
    })
  );

  console.log("[bulk] DONE — added:", added, "skipped:", skipped,
    "pastIgnored:", pastIgnored, "errors:", errors.length);

  if (errors.length > 0 && added === 0) {
    // All attempts failed with real errors — surface the first one
    return Response.json(
      { error: `DB error: ${errors[0]}`, added, skipped, pastIgnored, errors },
      { status: 500 }
    );
  }

  return Response.json({ added, skipped, pastIgnored, errors });
}
