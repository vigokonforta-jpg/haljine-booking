import prisma from "@/lib/prisma";

export async function getSiteSettings() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
  });

  if (settings) {
    return settings;
  }

  return prisma.siteSettings.create({
    data: { id: 1, instructions: "" },
  });
}
