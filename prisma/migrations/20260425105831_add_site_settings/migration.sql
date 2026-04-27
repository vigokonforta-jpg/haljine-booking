-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "instructions" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
