import { NextRequest } from "next/server";
import { isAuthenticated, checkPassword, setAdminPassword, hashPassword } from "@/lib/auth";

// PUT /api/admin/password
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { currentPassword, newPassword } = await request.json() as {
    currentPassword: string;
    newPassword: string;
  };
  if (!(await checkPassword(currentPassword))) {
    return Response.json({ error: "Pogrešna trenutna lozinka." }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 4) {
    return Response.json({ error: "Nova lozinka mora imati barem 4 znaka." }, { status: 400 });
  }
  await setAdminPassword(hashPassword(newPassword));
  return Response.json({ ok: true });
}
