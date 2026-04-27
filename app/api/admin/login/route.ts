import { NextRequest } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (!(await checkPassword(password))) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
