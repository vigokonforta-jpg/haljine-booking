import { NextRequest } from "next/server";
import { ADMIN_PASSWORD, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (password !== ADMIN_PASSWORD) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
