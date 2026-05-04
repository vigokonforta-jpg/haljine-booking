"use client";

import { useState, useEffect, useCallback } from "react";

type Slot = {
  id: number;
  date: string;
  startHour: number;
  maxSpots: number;
  spotsLeft: number;
};

type Step = "calendar" | "form" | "done";

const DAYS = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];
const MONTHS = [
  "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
  "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }
function formatHour(h: number) { return `${pad(h)}:00 – ${pad(h + 1)}:00`; }
function formatDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}.`;
}

/* ── Shared brand mark ────────────────────────────────── */
function NoemaBrand({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <div className="text-center">
      <p
        className={size === "lg" ? "text-4xl md:text-5xl font-light tracking-[0.45em] text-[#1A1A1A] uppercase" : "text-2xl font-light tracking-[0.4em] text-[#1A1A1A] uppercase"}
        style={{ fontFamily: "var(--font-cormorant), serif" }}
      >
        Noema
      </p>
      {size === "lg" && (
        <p
          className="mt-1 text-[10px] tracking-[0.35em] uppercase text-[#A09890] font-light"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Croatian Fashion Rental Closet
        </p>
      )}
    </div>
  );
}

/* ── Ornamental divider ───────────────────────────────── */
function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1 h-px bg-[#E2DDD6]" />
      <div className="w-1 h-1 rounded-full bg-[#C8C0B8]" />
      <div className="flex-1 h-px bg-[#E2DDD6]" />
    </div>
  );
}

/* ── Site footer ──────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "var(--noema-cream)", borderTop: "1px solid var(--noema-border)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <p
              className="text-base font-light tracking-[0.4em] uppercase text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Noema
            </p>
            <p
              className="text-[10px] tracking-[0.2em] uppercase text-[#A09890]"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Croatian Fashion Rental Closet
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-3" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#A09890]">Kontakt</p>
            <div className="space-y-1.5">
              <p className="text-xs text-[#6B6560]">Nova Ves 50, Zagreb</p>
              <p className="text-xs text-[#6B6560]">Croatia 10000</p>
              <a
                href="mailto:info@noema.hr"
                className="block text-xs text-[#6B6560] hover:text-[#1A1A1A] transition-colors"
              >
                info@noema.hr
              </a>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-3" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#A09890]">Pratite nas</p>
            <a
              href="https://instagram.com/noema.hr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[#6B6560] hover:text-[#1A1A1A] transition-colors group"
            >
              {/* Instagram icon */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
              @noema.hr
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E2DDD6] text-center">
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-[#C8C0B8]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            © 2026 Noema
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function BookingPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [nextSlots, setNextSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<Step>("calendar");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [people, setPeople] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [instructions, setInstructions] = useState<string>("");

  const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
  const nextYear  = viewMonth === 12 ? viewYear + 1 : viewYear;

  const fetchSlots = useCallback(async (year: number, month: number): Promise<Slot[]> => {
    try {
      const res = await fetch(`/api/availability?year=${year}&month=${month}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }, []);

  const refreshSlots = useCallback(() => {
    fetchSlots(viewYear, viewMonth).then(setSlots);
    fetchSlots(nextYear, nextMonth).then(setNextSlots);
  }, [fetchSlots, viewYear, viewMonth, nextYear, nextMonth]);

  useEffect(() => { refreshSlots(); }, [refreshSlots]);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => { if (!r.ok) throw new Error("settings fetch failed"); return r.json(); })
      .then(d => setInstructions(d.instructions ?? ""))
      .catch(() => setInstructions(""));
  }, []);

  const slotsByDate: Record<string, Slot[]> = {};
  for (const s of [...slots, ...nextSlots]) {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  function prevMonthNav() {
    const limit = toDateStr(today.getFullYear(), today.getMonth() + 1, 1);
    if (toDateStr(viewYear, viewMonth, 1) <= limit) return;
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonthNav() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  function selectDate(dateStr: string) {
    const daySlots = slotsByDate[dateStr];
    if (!daySlots || daySlots.every(s => s.spotsLeft <= 0)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  }

  function pickSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("form");
    setError("");
  }

  function backToCalendar() {
    setStep("calendar");
    refreshSlots();
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slotId: selectedSlot.id, people }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Greška pri rezervaciji");
      } else {
        const data = await res.json();
        setEmailSent(data.emailSent ?? false);
        setStep("done");
      }
    } catch {
      setError("Greška pri rezervaciji. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("calendar");
    setSelectedDate(null);
    setSelectedSlot(null);
    setForm({ name: "", email: "", phone: "" });
    setPeople(1);
    setEmailSent(false);
    refreshSlots();
  }

  function renderCalendarCells(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(year, month, d);
      const daySlots = slotsByDate[dateStr] ?? [];
      const hasAvailable = daySlots.some(s => s.spotsLeft > 0);
      const isPast = dateStr < todayStr;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === todayStr;
      cells.push(
        <button
          key={dateStr}
          onClick={() => selectDate(dateStr)}
          disabled={!hasAvailable || isPast}
          className={[
            "relative aspect-square flex flex-col items-center justify-center rounded-full text-sm transition-all duration-200 select-none",
            isPast
              ? "text-[#D0CAC3] cursor-not-allowed"
              : !hasAvailable
              ? "text-[#C8C0B8] cursor-not-allowed"
              : isSelected
              ? "bg-[#1A1A1A] text-white cursor-pointer"
              : "text-[#1A1A1A] hover:bg-[#F5F0EB] cursor-pointer",
          ].join(" ")}
        >
          <span className={isToday && !isSelected ? "underline underline-offset-2 decoration-[#A09890]" : ""}>{d}</span>
          {hasAvailable && !isPast && !isSelected && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1A1A1A] opacity-25" />
          )}
        </button>
      );
    }
    return cells;
  }

  /* ── Done / Confirmation ────────────────────────────── */
  if (step === "done" && selectedSlot) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--noema-bg)" }}>
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">

            {/* Top logo */}
            <div className="text-center mb-10">
              <NoemaBrand size="sm" />
            </div>

            {/* Confirmation card */}
            <div className="border border-[#E2DDD6] bg-white">
              {/* Checkmark header */}
              <div className="flex flex-col items-center py-10 px-6 border-b border-[#E2DDD6]"
                   style={{ background: "var(--noema-cream)" }}>
                <div className="w-14 h-14 rounded-full border border-[#1A1A1A] flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h1
                  className="text-3xl font-light text-[#1A1A1A] tracking-wide text-center"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  Rezervacija potvrđena!
                </h1>
              </div>

              {/* Booking summary */}
              <div className="px-8 py-7 space-y-5">
                {/* Client name */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0EBE3]">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A09890] mt-0.5"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Ime
                  </span>
                  <span
                    className="text-base font-light text-[#1A1A1A] text-right"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {form.name}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0EBE3]">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A09890] mt-0.5"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Datum
                  </span>
                  <span
                    className="text-base font-light text-[#1A1A1A] text-right"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {formatDate(selectedSlot.date)}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0EBE3]">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A09890] mt-0.5"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Termin
                  </span>
                  <span
                    className="text-base font-light text-[#1A1A1A] text-right"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {formatHour(selectedSlot.startHour)}
                  </span>
                </div>

                {/* People */}
                <div className="flex items-start justify-between gap-4">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase text-[#A09890] mt-0.5"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Broj osoba
                  </span>
                  <span
                    className="text-base font-light text-[#1A1A1A] text-right"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {people === 2 ? "2 osobe" : "1 osoba"}
                  </span>
                </div>
              </div>

              {/* Email confirmation message */}
              <div className="px-8 py-5 border-t border-[#E2DDD6]" style={{ background: "var(--noema-bg)" }}>
                <p
                  className="text-xs text-[#6B6560] text-center leading-relaxed"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {emailSent
                    ? "Potvrda je poslana na vašu email adresu. Veselimo se vašem dolasku!"
                    : "Veselimo se vašem dolasku! Za sva pitanja kontaktirajte nas izravno."}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-3">
              <button
                onClick={reset}
                className="w-full py-4 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Natrag na početak
              </button>
              <p
                className="text-center text-[11px] text-[#C8C0B8]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Za otkazivanje kontaktirajte nas izravno.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Booking form ──────────────────────────────────── */
  if (step === "form" && selectedSlot) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--noema-bg)" }}>
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm space-y-8">
            <button
              onClick={backToCalendar}
              className="flex items-center gap-2 text-[#A09890] hover:text-[#1A1A1A] transition-colors text-xs tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              <span className="text-base leading-none">←</span> Natrag
            </button>

            <NoemaBrand />
            <Divider />

            {/* Selected slot summary */}
            <div className="text-center space-y-1">
              <p
                className="text-2xl font-light text-[#1A1A1A] tracking-wide"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                {formatDate(selectedSlot.date)}
              </p>
              <p
                className="text-xs tracking-[0.2em] uppercase text-[#A09890]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {formatHour(selectedSlot.startHour)}
              </p>
            </div>

            <Divider />

            <form onSubmit={submitBooking} className="space-y-6">
              <p
                className="text-[10px] tracking-[0.25em] uppercase text-[#6B6560]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Vaši podaci
              </p>

              {[
                { id: "name",  label: "Ime i prezime", type: "text",  placeholder: "Ana Anić",         value: form.name,  key: "name"  as const },
                { id: "email", label: "Email adresa",  type: "email", placeholder: "ana@email.com",    value: form.email, key: "email" as const },
                { id: "phone", label: "Broj mobitela", type: "tel",   placeholder: "+385 91 234 5678", value: form.phone, key: "phone" as const },
              ].map(f => (
                <div key={f.id}>
                  <label
                    htmlFor={f.id}
                    className="block text-[10px] tracking-[0.2em] uppercase text-[#A09890] mb-2"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    required
                    type={f.type}
                    value={f.value}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border-b border-[#E2DDD6] bg-transparent py-2.5 text-sm text-[#1A1A1A] placeholder-[#C8C0B8] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  />
                </div>
              ))}

              {/* People selector */}
              <div>
                <label
                  className="block text-[10px] tracking-[0.2em] uppercase text-[#A09890] mb-2"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Broj osoba
                </label>
                <div className="flex gap-3">
                  {([1, 2] as const).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPeople(n)}
                      className={[
                        "flex-1 py-3 text-sm border transition-colors",
                        people === n
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "text-[#6B6560] border-[#E2DDD6] hover:border-[#1A1A1A]",
                      ].join(" ")}
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      {n === 1 ? "1 osoba" : "2 osobe"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {loading ? "Rezerviram…" : "Rezerviraj termin"}
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Calendar view ─────────────────────────────────── */
  const dateSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  function renderMonth(year: number, month: number, showNav: boolean) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {showNav ? (
            <button onClick={prevMonthNav} className="w-7 h-7 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] transition-colors text-lg leading-none">‹</button>
          ) : <div className="w-7" />}
          <h2
            className="text-xs tracking-[0.25em] uppercase text-[#6B6560]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {MONTHS[month - 1]} {year}
          </h2>
          {showNav ? (
            <button onClick={nextMonthNav} className="w-7 h-7 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] transition-colors text-lg leading-none">›</button>
          ) : <div className="w-7" />}
        </div>
        <div className="grid grid-cols-7">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] tracking-[0.1em] uppercase text-[#C8C0B8] py-1"
                 style={{ fontFamily: "var(--font-inter), sans-serif" }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {renderCalendarCells(year, month)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--noema-bg)" }}>
      {/* ── Hero ──────────────────────────────────────── */}
      <header className="pt-16 pb-10 px-6 text-center space-y-6 max-w-lg mx-auto w-full">
        <NoemaBrand />
        <Divider />
        <div className="space-y-2 py-2">
          <h1
            className="text-3xl md:text-4xl font-light italic text-[#1A1A1A] leading-snug"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Dobrodošli u Noema
          </h1>
          <p
            className="text-sm text-[#6B6560] leading-relaxed max-w-sm mx-auto"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Rezervirajte svoj termin i pronađite savršenu haljinu za posebnu prigodu
          </p>
        </div>
        <Divider />
      </header>

      {/* ── Custom instructions (admin-editable) ──────── */}
      {instructions.trim() && (
        <section className="px-4 max-w-lg mx-auto w-full mb-2">
          <div
            className="border border-[#E2DDD6] px-6 py-5 space-y-1"
            style={{ backgroundColor: "#F5F0EB" }}
          >
            <p
              className="text-[10px] tracking-[0.2em] uppercase text-[#A09890] mb-3"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Napomena
            </p>
            {instructions.split("\n").filter(l => l.trim()).map((line, i) => (
              <p
                key={i}
                className="text-sm text-[#6B6560] leading-relaxed"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                — {line.trim()}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ── Calendar section ──────────────────────────── */}
      <section className="flex-1 px-4 pb-12 max-w-lg mx-auto w-full space-y-6 mt-4">
        {/* Month 1 */}
        <div className="bg-white border border-[#E2DDD6] p-6">
          {renderMonth(viewYear, viewMonth, true)}
        </div>

        {/* Month 2 */}
        <div className="bg-white border border-[#E2DDD6] p-6">
          {renderMonth(nextYear, nextMonth, false)}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="bg-white border border-[#E2DDD6]">
            <div className="px-6 py-4 border-b border-[#E2DDD6]">
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-[#A09890]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Termini — {formatDate(selectedDate)}
              </p>
            </div>
            {dateSlots.length === 0 ? (
              <p className="px-6 py-6 text-sm text-[#C8C0B8]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                Nema dostupnih termina.
              </p>
            ) : (
              <div>
                {dateSlots.map((slot, i) => {
                  const available = slot.spotsLeft > 0;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => available && pickSlot(slot)}
                      disabled={!available}
                      className={[
                        "w-full flex items-center justify-between px-6 py-4 text-left transition-colors",
                        i > 0 ? "border-t border-[#E2DDD6]" : "",
                        available ? "hover:bg-[#F5F0EB] cursor-pointer" : "cursor-not-allowed",
                      ].join(" ")}
                    >
                      <span
                        className={`text-base font-light ${available ? "text-[#1A1A1A]" : "text-[#C8C0B8]"}`}
                        style={{ fontFamily: "var(--font-cormorant), serif" }}
                      >
                        {formatHour(slot.startHour)}
                      </span>
                      <span
                        className={`text-xs tracking-wide ${available ? "text-[#6B6560]" : "text-[#C8C0B8]"}`}
                        style={{ fontFamily: "var(--font-inter), sans-serif" }}
                      >
                        {available
                          ? `${slot.spotsLeft} ${slot.spotsLeft === 1 ? "slobodno mjesto" : "slobodna mjesta"}`
                          : "Popunjeno"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <p
            className="text-center text-xs text-[#C8C0B8] tracking-wide"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Odaberite dostupan datum za pregled termina
          </p>
        )}
      </section>

      <Footer />
    </div>
  );
}
