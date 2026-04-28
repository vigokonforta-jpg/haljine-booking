-- AlterTable: add people field to Booking
ALTER TABLE "Booking" ADD COLUMN "people" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: BookingLimit for per-email cancellation tracking
CREATE TABLE "BookingLimit" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "cancelCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BookingLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingLimit_email_key" ON "BookingLimit"("email");
