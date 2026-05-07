import { NextRequest } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || !(await checkPassword(password))) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }

    await createSession();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
