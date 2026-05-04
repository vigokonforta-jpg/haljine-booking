@AGENTS.md

# NOEMA Booking App

Appointment booking system for NOEMA — a Croatian fashion rental closet in Zagreb.
Live at: https://haljine-booking.vercel.app
GitHub: https://github.com/vigokonforta-jpg/haljine-booking

## Tech Stack

- **Next.js 16** (App Router, Turbopack, `"use client"`, Route Handlers)
- **TypeScript**
- **Tailwind CSS v4** (`@theme inline`, CSS custom properties)
- **Prisma v7** with `@prisma/adapter-pg` + `pg` — PostgreSQL via Vercel Postgres
  - Schema in `prisma/schema.prisma`, client output at `app/generated/prisma`
  - Prisma 7 breaking change: no `url` in schema — connection string lives in `prisma.config.ts` (migrations) and `lib/prisma.ts` (runtime adapter)
- **Resend SDK v6** — transactional email (`{data, error}` return pattern, not throws)
- **Session auth** — HTTP-only cookie `admin_session=authenticated`, SHA-256 password hash stored in DB

## Deployment

- **Vercel** (Hobby plan — may need Pro for commercial use)
- **Vercel Postgres** auto-provisions `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`
- Migrations run via `prisma migrate deploy` on each Vercel deploy
- Pending: connect **noema.hr** domain (also needed for `info@noema.hr` sender in Resend)

## Environment Variables

| Variable | Source | Purpose |
|---|---|---|
| `POSTGRES_URL` | Vercel Postgres (auto) | Runtime DB queries (pooled) |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres (auto) | Prisma migrations (direct) |
| `RESEND_API_KEY` | resend.com | Transactional email |
| `ADMIN_PASSWORD` | Manual | Fallback admin password if not set in DB |
| `REMINDER_SECRET` | Manual | Auth token for cron-triggered reminder endpoint |
| `NEXT_PUBLIC_SITE_URL` | Manual | Canonical URL for SEO metadata (`https://haljine-booking.vercel.app`) |

## Features

### Client booking page (`/`)
- NOEMA branding: Cormorant Garamond serif + Inter sans-serif, cream/beige palette
- Two-month calendar showing available slots; dots indicate availability
- Time slot picker for selected date
- Booking form: name, email, phone, number of people (1 or 2)
- Booking limits enforced server-side:
  - Max **1 booking per 7-day window** per email
  - Max **2 total cancellations** per email (tracked in `BookingLimit` table)
  - Slot capacity based on **sum of people**, not count of bookings (`maxSpots=3` = 3 people)
- Confirmation screen after booking; confirmation email sent via Resend
- Admin-editable custom notice shown above the calendar (from Obavijesti tab)
- SEO: full metadata, OG image (server-generated), `robots.ts`, `sitemap.ts`

### Admin panel (`/admin`, password-protected)

**Rezervacije tab** — upcoming bookings
- Grouped by week (static divider label: "Tjedan 4.5. – 10.5. 2026.")
- Days within each week expanded by default, collapsible
- Each day shows: weekday name bold/uppercase + date, booking count badge
- Each booking shows: time, people count, name, email, phone, delete button
- Delete increments `BookingLimit.cancelCount` for that email

**Dostupnost tab** — availability slot management
- Two-month calendar for multi-day selection (left column)
- Bulk scheduling: select days, choose specific hours or hour range, set max spots
  - Range is exclusive-end: range 9–17 creates slots 09:00–10:00 … 16:00–17:00
- Single slot form (right column, separate DOM branch from bulk form)
- Slot list grouped by week → day → time slots with checkboxes
- Bulk delete: "Odaberi sve" / "Obriši odabrane (X)" with single confirmation dialog

**Obavijesti tab** — custom client-facing notice
- Admin writes multi-line text; each line shown as "— …" on client page

**Postavke tab**
- Change admin password (stored as SHA-256 hash in `SiteSettings` table)
- Manual cleanup trigger (deletes slots/bookings older than 30 days)

### Background / cron
- `POST /api/send-reminders` — send 24h-before reminder emails + run auto-cleanup
  - Auth: admin session cookie OR `x-reminder-secret` header
  - Finds all future bookings with `reminderSent=false`

## Database Models (Prisma)

```
AvailabilitySlot  id, date (YYYY-MM-DD), startHour (0-23), maxSpots, bookings[], createdAt
Booking           id, name, email, phone, people (1|2), availabilitySlotId, reminderSent, createdAt
BookingLimit      id, email (unique), cancelCount
SiteSettings      id=1, instructions, adminPassword (SHA-256), updatedAt
```

## Key Files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Client booking page |
| `app/admin/page.tsx` | Admin panel (single client component) |
| `app/api/bookings/route.ts` | Create booking (enforces all limits) |
| `app/api/availability/route.ts` | Public slot availability (uses SUM of people) |
| `app/api/admin/bookings/[id]/route.ts` | Delete booking + increment cancelCount |
| `app/api/admin/availability/route.ts` | GET/POST admin slots |
| `app/api/admin/availability/[id]/route.ts` | DELETE single slot |
| `app/api/send-reminders/route.ts` | Cron: send reminders + cleanup |
| `lib/prisma.ts` | Prisma client with PrismaPg adapter |
| `lib/email.ts` | Resend email helpers |
| `lib/auth.ts` | Session cookie + SHA-256 password check |
| `prisma.config.ts` | Migration datasource URL |
| `app/opengraph-image.tsx` | Server-generated OG image (1200×630) |

## Pending / Known Limitations

- **noema.hr domain** not yet connected — needed for custom URL and Resend sender `info@noema.hr` (currently sends from `onboarding@resend.dev`)
- **Vercel Hobby plan** — may require upgrade to Pro for commercial/production use
- No automated cron setup yet for `send-reminders` — must be triggered manually or via external cron service
