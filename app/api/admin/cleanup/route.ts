import prisma from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function runCleanup(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  // Cascade delete removes bookings automatically (onDelete: Cascade in schema)
  const { count } = await prisma.availabilitySlot.deleteMany({
    where: { date: { lt: cutoffStr } },
  });
  return count;
}

// POST /api/admin/cleanup — manual trigger from admin panel
export async function POST() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await runCleanup();
  return Response.json({ deleted });
}
