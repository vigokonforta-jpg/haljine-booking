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

  const today = new Date().toISOString().slice(0, 10);

  let added = 0;
  let skipped = 0;
  let pastIgnored = 0;
  const errors: string[] = [];

  await Promise.all(
    slots.map(async (s) => {
      if (s.date < today) {
        pastIgnored++;
        return;
      }
      try {
        await prisma.availabilitySlot.create({
          data: {
            date: s.date,
            startHour: Number(s.startHour),
            maxSpots: Number(s.maxSpots),
          },
        });
        added++;
      } catch (err) {
        const isUniqueViolation =
          typeof err === "object" && err !== null && "code" in err &&
          (err as { code: unknown }).code === "P2002";
        if (isUniqueViolation) {
          skipped++;
        } else {
          errors.push(`${s.date}@${s.startHour}: ${String(err)}`);
        }
      }
    })
  );

  if (errors.length > 0 && added === 0) {
    return Response.json(
      { error: `DB error: ${errors[0]}`, added, skipped, pastIgnored, errors },
      { status: 500 }
    );
  }

  return Response.json({ added, skipped, pastIgnored, errors });
}
