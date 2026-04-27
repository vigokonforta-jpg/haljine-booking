"use client";

import { useState, useEffect, useCallback } from "react";

type BookingEntry = {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  startHour: number;
  createdAt: string;
};

type SlotEntry = {
  id: number;
  date: string;
  startHour: number;
  maxSpots: number;
  booked: number;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatHour(h: number) { return `${pad(h)}:00 – ${pad(h + 1)}:00`; }

const MONTHS = [
  "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
  "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
];
const DAYS_HR = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"bookings" | "availability" | "settings">("bookings");

  // Settings state
  const [instructions, setInstructions] = useState("");
  const [instructionsSaving, setInstructionsSaving] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [instructionsError, setInstructionsError] = useState("");

  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [availSlots, setAvailSlots] = useState<SlotEntry[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newHour, setNewHour] = useState("9");
  const [newMaxSpots, setNewMaxSpots] = useState("3");
  const [slotError, setSlotError] = useState("");
  const [slotSuccess, setSlotSuccess] = useState("");
  const [bulkDate, setBulkDate] = useState("");
  const [bulkHours, setBulkHours] = useState("9,10,11,14,15,16");

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    const res = await fetch("/api/admin/bookings");
    if (res.ok) setBookings(await res.json());
    setBookingsLoading(false);
  }, []);

  const fetchSlots = useCallback(async () => {
    const res = await fetch("/api/admin/availability");
    if (res.ok) setAvailSlots(await res.json());
  }, []);

  // Check existing session on mount
  useEffect(() => {
    fetch("/api/admin/bookings")
      .then(res => {
        if (res.ok) {
          res.json().then(setBookings);
          setAuthed(true);
        }
      })
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (authed) {
      fetchSlots();
      fetch("/api/admin/settings")
        .then(r => r.json())
        .then(d => setInstructions(d.instructions ?? ""));
    }
  }, [authed, fetchSlots]);

  // Auto-poll bookings every 30s while on bookings tab
  useEffect(() => {
    if (!authed || tab !== "bookings") return;
    const interval = setInterval(fetchBookings, 30_000);
    return () => clearInterval(interval);
  }, [authed, tab, fetchBookings]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      fetchBookings();
      fetchSlots();
    } else {
      setLoginError("Pogrešna lozinka");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setBookings([]);
    setAvailSlots([]);
  }

  async function deleteBooking(id: number) {
    if (!confirm("Obrisati ovu rezervaciju?")) return;
    await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    setBookings(bs => bs.filter(b => b.id !== id));
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setSlotError(""); setSlotSuccess("");
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, startHour: Number(newHour), maxSpots: Number(newMaxSpots) }),
    });
    if (res.ok) { setSlotSuccess("Termin dodan."); await fetchSlots(); }
    else { const d = await res.json(); setSlotError(d.error ?? "Greška"); }
  }

  async function addBulkSlots(e: React.FormEvent) {
    e.preventDefault();
    setSlotError(""); setSlotSuccess("");
    const hours = bulkHours.split(",").map(h => parseInt(h.trim())).filter(h => !isNaN(h));
    let added = 0;
    for (const h of hours) {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: bulkDate, startHour: h, maxSpots: Number(newMaxSpots) }),
      });
      if (res.ok) added++;
    }
    setSlotSuccess(`Dodano ${added} termina za ${bulkDate}.`);
    await fetchSlots();
  }

  async function deleteSlot(id: number) {
    if (!confirm("Obrisati ovaj termin? Sve vezane rezervacije će biti obrisane.")) return;
    await fetch(`/api/admin/availability/${id}`, { method: "DELETE" });
    setAvailSlots(ss => ss.filter(s => s.id !== id));
  }

  async function sendReminders() {
    const res = await fetch("/api/send-reminders", { method: "POST" });
    const data = await res.json();
    alert(`Poslano ${data.sent} podsjetnika.`);
  }

  async function saveInstructions(e: React.FormEvent) {
    e.preventDefault();
    setInstructionsSaving(true);
    setInstructionsSaved(false);
    setInstructionsError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions }),
    });
    setInstructionsSaving(false);
    if (res.ok) {
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 3000);
    } else {
      setInstructionsError(res.status === 401 ? "Sesija je istekla. Osvježite stranicu i prijavite se ponovo." : "Greška pri spremanju. Pokušajte ponovo.");
    }
  }

  const slotsByDate: Record<string, SlotEntry[]> = {};
  for (const s of availSlots) {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  }
  const sortedDates = Object.keys(slotsByDate).sort();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const calNextMonth = calMonth === 12 ? 1 : calMonth + 1;
  const calNextYear  = calMonth === 12 ? calYear + 1 : calYear;
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function buildCalendar(year: number, month: number) {
    return {
      firstDay: new Date(year, month - 1, 1).getDay(),
      daysInMonth: new Date(year, month, 0).getDate(),
    };
  }

  function renderAvailCalendar(year: number, month: number) {
    const { firstDay, daysInMonth } = buildCalendar(year, month);
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      const daySlots = slotsByDate[dateStr];
      const hasSlots = !!daySlots?.length;
      const isPast = dateStr < todayStr;
      cells.push(
        <button
          key={dateStr}
          onClick={() => { setBulkDate(dateStr); setNewDate(dateStr); }}
          className={[
            "aspect-square flex flex-col items-center justify-center rounded-full text-xs transition-colors",
            isPast
              ? "text-[#D0CAC3]"
              : hasSlots
              ? "bg-[#1A1A1A] text-white font-medium"
              : "hover:bg-[#F5F0EB] text-[#6B6560]",
          ].join(" ")}
        >
          <span>{d}</span>
          {hasSlots && !isPast && (
            <span className="text-[8px] text-white/70">{daySlots.length}</span>
          )}
        </button>
      );
    }
    return cells;
  }

  const inputClass = "w-full border border-[#E2DDD6] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#C8C0B8] focus:outline-none focus:border-[#1A1A1A] transition-colors";
  const labelClass = "block text-[10px] tracking-[0.15em] uppercase text-[#A09890] mb-1.5";

  /* ── Session check spinner ────────────────────────── */
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--noema-bg)" }}>
        <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Login ────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--noema-bg)" }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-1">
            <p className="text-3xl font-light tracking-[0.4em] text-[#1A1A1A] uppercase"
               style={{ fontFamily: "var(--font-cormorant), serif" }}>Noema</p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#A09890]"
               style={{ fontFamily: "var(--font-inter), sans-serif" }}>Admin panel</p>
          </div>
          <div className="h-px bg-[#E2DDD6]" />
          <form onSubmit={login} className="space-y-5">
            <div>
              <label className={labelClass} style={{ fontFamily: "var(--font-inter), sans-serif" }}>Lozinka</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-inter), sans-serif" }}>{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Prijavi se
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--noema-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Top bar */}
      <header className="border-b border-[#E2DDD6] bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span
            className="text-lg font-light tracking-[0.35em] uppercase text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Noema
          </span>
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#C8C0B8]">Admin</span>
          <a href="/" className="text-[11px] text-[#A09890] hover:text-[#1A1A1A] transition-colors tracking-wide">
            ← Klijentska stranica
          </a>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendReminders}
            className="text-xs tracking-[0.1em] border border-[#E2DDD6] px-4 py-2 text-[#6B6560] hover:bg-[#F5F0EB] transition-colors"
          >
            Pošalji podsjetnike
          </button>
          <button
            onClick={logout}
            className="text-xs tracking-[0.1em] border border-[#E2DDD6] px-4 py-2 text-[#6B6560] hover:bg-[#F5F0EB] transition-colors"
          >
            Odjava
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex border-b border-[#E2DDD6] mb-8">
          {(["bookings", "availability", "settings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-6 py-3 text-xs tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px",
                tab === t
                  ? "border-[#1A1A1A] text-[#1A1A1A]"
                  : "border-transparent text-[#A09890] hover:text-[#6B6560]",
              ].join(" ")}
            >
              {t === "bookings" ? "Rezervacije" : t === "availability" ? "Dostupnost" : "Obavijesti"}
            </button>
          ))}
        </div>

        {/* ── Bookings tab ──────────────────────────────── */}
        {tab === "bookings" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560]">Nadolazeće rezervacije</h2>
              <button onClick={fetchBookings} className="text-xs text-[#A09890] hover:text-[#1A1A1A] transition-colors">
                ↻ Osvježi
              </button>
            </div>

            {bookingsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white border border-[#E2DDD6] p-12 text-center">
                <p className="text-sm text-[#C8C0B8]">Nema nadolazećih rezervacija.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E2DDD6] divide-y divide-[#E2DDD6]">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center gap-5 px-5 py-4">
                    {/* Date badge */}
                    <div className="w-16 shrink-0 text-center border border-[#E2DDD6] py-2">
                      <p className="text-[10px] tracking-[0.1em] uppercase text-[#A09890]">{b.date}</p>
                      <p
                        className="text-lg font-light text-[#1A1A1A]"
                        style={{ fontFamily: "var(--font-cormorant), serif" }}
                      >
                        {pad(b.startHour)}:00
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{b.name}</p>
                      <p className="text-xs text-[#A09890] truncate mt-0.5">{b.email}</p>
                      <p className="text-xs text-[#A09890] mt-0.5">{b.phone}</p>
                    </div>

                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="shrink-0 text-[#C8C0B8] hover:text-red-400 transition-colors p-2"
                      title="Obriši"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Availability tab ──────────────────────────── */}
        {tab === "availability" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left col: calendars + forms */}
            <div className="space-y-5">
              {/* Mini calendar 1 */}
              {[
                { year: calYear, month: calMonth, showNav: true },
                { year: calNextYear, month: calNextMonth, showNav: false },
              ].map(({ year, month, showNav }) => (
                <div key={`${year}-${month}`} className="bg-white border border-[#E2DDD6] p-4">
                  <div className="flex items-center justify-between mb-3">
                    {showNav ? (
                      <button
                        onClick={() => { if (calMonth === 1) { setCalYear(y => y-1); setCalMonth(12); } else setCalMonth(m => m-1); }}
                        className="w-6 h-6 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] transition-colors"
                      >‹</button>
                    ) : <div className="w-6" />}
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560]">
                      {MONTHS[month - 1]} {year}
                    </span>
                    {showNav ? (
                      <button
                        onClick={() => { if (calMonth === 12) { setCalYear(y => y+1); setCalMonth(1); } else setCalMonth(m => m+1); }}
                        className="w-6 h-6 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] transition-colors"
                      >›</button>
                    ) : <div className="w-6" />}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {DAYS_HR.map(d => (
                      <div key={d} className="text-center text-[9px] tracking-wider uppercase text-[#C8C0B8] py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">{renderAvailCalendar(year, month)}</div>
                </div>
              ))}

              {/* Add single slot */}
              <div className="bg-white border border-[#E2DDD6] p-5">
                <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560] mb-4">Dodaj termin</h3>
                <form onSubmit={addSlot} className="space-y-4">
                  <div>
                    <label className={labelClass}>Datum</label>
                    <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Sat (0–23)</label>
                      <input type="number" min="0" max="23" required value={newHour} onChange={e => setNewHour(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Maks. mjesta</label>
                      <input type="number" min="1" max="20" required value={newMaxSpots} onChange={e => setNewMaxSpots(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  {slotError   && <p className="text-xs text-red-500">{slotError}</p>}
                  {slotSuccess && <p className="text-xs text-emerald-600">{slotSuccess}</p>}
                  <button type="submit" className="w-full py-3 bg-[#1A1A1A] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#333] transition-colors">
                    Dodaj termin
                  </button>
                </form>
              </div>

              {/* Bulk add */}
              <div className="bg-white border border-[#E2DDD6] p-5">
                <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560] mb-1">Dodaj više termina</h3>
                <p className="text-[11px] text-[#C8C0B8] mb-4">Sate odvojite zarezom za odabrani datum</p>
                <form onSubmit={addBulkSlots} className="space-y-4">
                  <div>
                    <label className={labelClass}>Datum</label>
                    <input type="date" required value={bulkDate} onChange={e => setBulkDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Sati (npr. 9,10,11,14,15)</label>
                    <input type="text" required value={bulkHours} onChange={e => setBulkHours(e.target.value)} className={inputClass} />
                  </div>
                  <button type="submit" className="w-full py-3 border border-[#1A1A1A] text-[#1A1A1A] text-xs tracking-[0.15em] uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors">
                    Dodaj sve termine
                  </button>
                </form>
              </div>
            </div>

            {/* Right col: slot list */}
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560]">Postavljeni termini</h3>
                <button onClick={fetchSlots} className="text-xs text-[#A09890] hover:text-[#1A1A1A] transition-colors">↻</button>
              </div>
              {sortedDates.length === 0 ? (
                <div className="bg-white border border-[#E2DDD6] p-10 text-center">
                  <p className="text-sm text-[#C8C0B8]">Nema postavljenih termina.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map(date => (
                    <div key={date} className="bg-white border border-[#E2DDD6]">
                      <div className="px-4 py-2.5 border-b border-[#E2DDD6]">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-[#A09890]">{date}</p>
                      </div>
                      <div>
                        {slotsByDate[date].sort((a, b) => a.startHour - b.startHour).map((s, i) => (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-[#E2DDD6]" : ""}`}
                          >
                            <span className="text-sm text-[#1A1A1A]">{formatHour(s.startHour)}</span>
                            <span className="text-xs text-[#A09890]">{s.booked}/{s.maxSpots}</span>
                            <button
                              onClick={() => deleteSlot(s.id)}
                              className="text-[#C8C0B8] hover:text-red-400 transition-colors ml-3"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Settings / Obavijesti tab ──────────────── */}
        {tab === "settings" && (
          <div className="max-w-lg">
            <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560] mb-6">
              Obavijesti za klijente
            </h2>

            <form onSubmit={saveInstructions} className="space-y-5">
              <div className="bg-white border border-[#E2DDD6] p-5 space-y-4">
                <p
                  className="text-xs text-[#6B6560] leading-relaxed"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Tekst se prikazuje klijentima na stranici za rezervacije između pozdravne poruke i kalendara.
                  Svaki red bit će prikazan kao zasebna napomena. Ostavite prazno ako nema obavijesti.
                </p>
                <div>
                  <label
                    className={labelClass}
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Tekst obavijesti
                  </label>
                  <textarea
                    rows={6}
                    value={instructions}
                    onChange={e => { setInstructions(e.target.value); setInstructionsSaved(false); }}
                    placeholder={"Donesite osobnu iskaznicu\nParking dostupan na ulici\nMolimo javite se 5 minuta ranije"}
                    className="w-full border border-[#E2DDD6] bg-[#FAFAF8] px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#C8C0B8] focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  />
                </div>
              </div>

              {/* Preview */}
              {instructions.trim() && (
                <div className="border border-[#E2DDD6] p-5 space-y-2" style={{ background: "var(--noema-cream)" }}>
                  <p
                    className="text-[10px] tracking-[0.2em] uppercase text-[#A09890] mb-3"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    Pregled (kako vide klijenti)
                  </p>
                  {instructions.split("\n").filter(l => l.trim()).map((line, i) => (
                    <p
                      key={i}
                      className="text-sm text-[#6B6560]"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      — {line.trim()}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={instructionsSaving}
                  className="px-8 py-3 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {instructionsSaving ? "Spremam…" : "Spremi"}
                </button>
                {instructionsSaved && (
                  <span
                    className="text-xs text-emerald-600 tracking-wide"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    ✓ Obavijesti su spremljene
                  </span>
                )}
                {instructionsError && (
                  <span
                    className="text-xs text-red-600 tracking-wide"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    {instructionsError}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
