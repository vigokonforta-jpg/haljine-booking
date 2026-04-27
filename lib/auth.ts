import { cookies } from "next/headers";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

const SESSION_COOKIE = "admin_session";
const SESSION_VALUE = "authenticated";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

export function hashPassword(password: string): string {
  return createHash("sha256").update(`noema:${password}`).digest("hex");
}

export async function checkPassword(password: string): Promise<boolean> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (settings?.adminPassword) {
      return settings.adminPassword === hashPassword(password);
    }
  } catch {
    // DB unavailable — fall back to env var
  }
  return password === ADMIN_PASSWORD;
}

export async function setAdminPassword(hashedPassword: string): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { adminPassword: hashedPassword },
    create: { id: 1, instructions: "", adminPassword: hashedPassword },
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export async function createSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
