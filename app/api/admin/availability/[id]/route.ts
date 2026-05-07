import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.availabilitySlot.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (err) {
    const isNotFound =
      typeof err === "object" && err !== null && "code" in err &&
      (err as { code: unknown }).code === "P2025";
    if (isNotFound) {
      return Response.json({ error: "Slot not found" }, { status: 404 });
    }
    return Response.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthenticated())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { maxSpots } = await request.json();
    if (typeof maxSpots !== "number" || maxSpots < 1) {
      return Response.json({ error: "maxSpots mora biti pozitivan broj" }, { status: 400 });
    }

    const slot = await prisma.availabilitySlot.update({
      where: { id: Number(id) },
      data: { maxSpots },
      include: { bookings: { select: { people: true } } },
    });
    return Response.json({
      id: slot.id,
      date: slot.date,
      startHour: slot.startHour,
      maxSpots: slot.maxSpots,
      booked: slot.bookings.reduce((sum, booking) => sum + booking.people, 0),
    });
  } catch (err) {
    const isNotFound =
      typeof err === "object" && err !== null && "code" in err &&
      (err as { code: unknown }).code === "P2025";
    if (isNotFound) {
      return Response.json({ error: "Slot not found" }, { status: 404 });
    }
    return Response.json({ error: "Failed to update slot" }, { status: 500 });
  }
}
