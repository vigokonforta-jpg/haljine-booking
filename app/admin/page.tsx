"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type BookingEntry = {
  id: number; name: string; email: string; phone: string;
  people: number; date: string; startHour: number; createdAt: string;
};
type SlotEntry = {
  id: number; date: string; startHour: number; maxSpots: number; booked: number;
};
type DayConfig = { from: string; to: string; maxSpots: string };

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatHour(h: number) { return `${pad(h)}:00 – ${pad(h + 1)}:00`; }

const WEEKDAYS_FULL = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
const MONTHS_GEN = [
  "siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja",
  "srpnja", "kolovoza", "rujna", "listopada", "studenog", "prosinca",
];
const DAYS_FULL = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

// Returns the ISO Monday of the week containing dateStr, as "YYYY-MM-DD"
function getMondayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(date);
  mon.setDate(date.getDate() + diff);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
}

// "1.5. – 7.5." or "1.5. – 7.5. 2026." when includeYear=true
function formatWeekRange(mondayStr: string, includeYear = false): string {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const a = `${mon.getDate()}.${mon.getMonth() + 1}.`;
  const b = `${sun.getDate()}.${sun.getMonth() + 1}.`;
  return includeYear ? `${a} – ${b} ${mon.getFullYear()}.` : `${a} – ${b}`;
}

// Week navigation helpers — Mon through Sat (6 days)
function getWeekMonday(offset: number): Date {
  const today = new Date();
  const dow = today.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + toMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(offset: number): string[] {
  const monday = getWeekMonday(offset);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

function formatWeekLabel(offset: number): string {
  const dates = getWeekDates(offset);
  const [y, m0, d0] = dates[0].split("-").map(Number);
  const [, m5, d5] = dates[5].split("-").map(Number);
  return `${d0}.${m0}. – ${d5}.${m5}. ${y}.`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"bookings" | "availability" | "settings" | "postavke">("bookings");

  // Obavijesti
  const [instructions, setInstructions] = useState("");
  const [instructionsSaving, setInstructionsSaving] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [instructionsError, setInstructionsError] = useState("");

  // Bookings
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Availability — slot data
  const [availSlots, setAvailSlots] = useState<SlotEntry[]>([]);

  // Availability — week navigation (shared by both columns)
  const [weekOffset, setWeekOffset] = useState(0);

  // Availability — left column: day checkboxes + per-day config
  const [checkedDays, setCheckedDays] = useState<Set<number>>(new Set());
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>({});
  const [addingSlots, setAddingSlots] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  // Availability — right column: expansion + inline editing
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [deletingDay, setDeletingDay] = useState<string | null>(null);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdResult, setPwdResult] = useState<{ ok?: boolean; msg: string } | null>(null);

  // Cleanup
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState("");

  // Loading / error states
  const [loginLoading, setLoginLoading] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<number | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [bookingsError, setBookingsError] = useState("");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError("");
    try {
      const res = await fetch("/api/admin/bookings");
      if (res.ok) setBookings(await res.json());
      else setBookingsError("Greška pri učitavanju rezervacija.");
    } catch {
      setBookingsError("Greška pri učitavanju rezervacija. Provjerite vezu.");
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/availability");
      if (res.ok) setAvailSlots(await res.json());
    } catch {
      // silent — slots will just stay stale
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then(res => {
        if (res.ok) { res.json().then(setBookings); setAuthed(true); }
      })
      .finally(() => setAuthChecking(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!authed) return;
    void fetchSlots();
    fetch("/api/admin/settings").then(r => r.json()).then(d => setInstructions(d.instructions ?? ""));
  }, [authed, fetchSlots]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!authed || tab !== "bookings") return;
    const interval = setInterval(fetchBookings, 30_000);
    return () => clearInterval(interval);
  }, [authed, tab, fetchBookings]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setAuthed(true); fetchBookings(); fetchSlots(); }
      else setLoginError("Pogrešna lozinka");
    } catch {
      setLoginError("Greška pri prijavi. Provjerite vezu i pokušajte ponovo.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false); setBookings([]); setAvailSlots([]);
  }

  async function deleteBooking(id: number) {
    if (!confirm("Obrisati ovu rezervaciju?")) return;
    setDeletingBooking(id);
    try {
      await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      setBookings(bs => bs.filter(b => b.id !== id));
    } catch {
      alert("Greška pri brisanju rezervacije. Pokušajte ponovo.");
    } finally {
      setDeletingBooking(null);
    }
  }

  async function sendReminders() {
    setSendingReminders(true);
    try {
      const res = await fetch("/api/send-reminders", { method: "POST" });
      if (!res.ok) { alert("Greška pri slanju. Pokušajte se odjaviti i prijaviti ponovo."); return; }
      const data = await res.json();
      alert(data.sent > 0 ? `Poslano ${data.sent} podsjetnika.` : "Nema novih podsjetnika za slanje.");
    } catch {
      alert("Greška pri slanju podsjetnika. Provjerite vezu.");
    } finally {
      setSendingReminders(false);
    }
  }

  async function saveInstructions(e: React.FormEvent) {
    e.preventDefault();
    setInstructionsSaving(true); setInstructionsSaved(false); setInstructionsError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions }),
    });
    setInstructionsSaving(false);
    if (res.ok) { setInstructionsSaved(true); setTimeout(() => setInstructionsSaved(false), 3000); }
    else setInstructionsError(res.status === 401 ? "Sesija je istekla. Osvježite stranicu." : "Greška pri spremanju.");
  }

  // ── Dostupnost — week scheduling ──────────────────

  function changeWeek(delta: number) {
    setWeekOffset(o => o + delta);
    setCheckedDays(new Set());
    setDayConfigs({});
    setAddError("");
    setAddSuccess("");
  }

  function toggleCheckedDay(i: number) {
    setCheckedDays(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
        setDayConfigs(c => ({ ...c, [i]: c[i] ?? { from: "9", to: "17", maxSpots: "3" } }));
      }
      return next;
    });
  }

  function updateDayConfig(i: number, field: keyof DayConfig, value: string) {
    setDayConfigs(c => ({
      ...c,
      [i]: { ...(c[i] ?? { from: "9", to: "17", maxSpots: "3" }), [field]: value },
    }));
  }

  async function addWeekSlots(e: React.FormEvent) {
    e.preventDefault();
    setAddingSlots(true); setAddError(""); setAddSuccess("");

    const weekDates = getWeekDates(weekOffset);
    const slots: { date: string; startHour: number; maxSpots: number }[] = [];

    for (const i of Array.from(checkedDays).sort((a, b) => a - b)) {
      const config = dayConfigs[i] ?? { from: "9", to: "17", maxSpots: "3" };
      const from = parseInt(config.from);
      const to = parseInt(config.to);
      const maxSpots = parseInt(config.maxSpots);
      if (isNaN(from) || isNaN(to) || from >= to || isNaN(maxSpots)) continue;
      for (let h = from; h < to; h++) {
        slots.push({ date: weekDates[i], startHour: h, maxSpots });
      }
    }

    if (!slots.length) {
      setAddError("Nema valjanih termina za dodati. Provjerite da je 'Od' manji od 'Do'.");
      setAddingSlots(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Greška pri dodavanju."); return; }
      const { added, skipped } = data;
      setAddSuccess(
        `Dodano ${added} ${added === 1 ? "termin" : "termina"}` +
        (skipped > 0 ? ` (${skipped} preskočeno — već postoje)` : "") + "."
      );
      setCheckedDays(new Set());
      setDayConfigs({});
      await fetchSlots();
    } catch {
      setAddError("Greška pri dodavanju. Pokušajte ponovo.");
    } finally {
      setAddingSlots(false);
    }
  }

  async function deleteSlot(id: number) {
    if (!confirm("Obrisati ovaj termin? Vezane rezervacije bit će obrisane.")) return;
    setDeletingSlot(id);
    try {
      await fetch(`/api/admin/availability/${id}`, { method: "DELETE" });
      setAvailSlots(prev => prev.filter(s => s.id !== id));
    } catch {
      alert("Greška pri brisanju termina. Pokušajte ponovo.");
    } finally {
      setDeletingSlot(null);
    }
  }

  async function deleteDaySlots(dateStr: string, daySlots: SlotEntry[], dayLabel: string) {
    if (!confirm(`Obrisati sve termine za ${dayLabel}?`)) return;
    setDeletingDay(dateStr);
    try {
      await Promise.all(daySlots.map(s => fetch(`/api/admin/availability/${s.id}`, { method: "DELETE" })));
      setAvailSlots(prev => prev.filter(s => s.date !== dateStr));
      setExpandedDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    } catch {
      alert("Greška pri brisanju. Pokušajte ponovo.");
      await fetchSlots();
    } finally {
      setDeletingDay(null);
    }
  }

  async function updateMaxSpots(id: number, newValue: number) {
    if (newValue < 1) return;
    // Optimistic update
    setAvailSlots(prev => prev.map(s => s.id === id ? { ...s, maxSpots: newValue } : s));
    setSavingSlot(id);
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSpots: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      await fetchSlots();
    } finally {
      setSavingSlot(null);
    }
  }

  // ── Postavke ──────────────────────────────────────

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdResult(null);
    if (newPwd !== confirmPwd) { setPwdResult({ msg: "Nove lozinke se ne podudaraju." }); return; }
    if (newPwd.length < 4) { setPwdResult({ msg: "Nova lozinka mora imati barem 4 znaka." }); return; }
    setPwdSaving(true);
    const res = await fetch("/api/admin/password", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    setPwdSaving(false);
    if (res.ok) {
      setPwdResult({ ok: true, msg: "Lozinka je uspješno promijenjena." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      setPwdResult({ msg: data.error ?? "Greška pri promjeni lozinke." });
    }
  }

  async function runCleanup() {
    setCleanupRunning(true); setCleanupResult("");
    const res = await fetch("/api/admin/cleanup", { method: "POST" });
    const data = await res.json();
    setCleanupRunning(false);
    setCleanupResult(
      res.ok
        ? data.deleted > 0
          ? `Obrisano ${data.deleted} starih termina i njihovih rezervacija.`
          : "Nema starih rezervacija za brisanje."
        : "Greška pri čišćenju."
    );
  }

  // ── Derived data ──────────────────────────────────

  const slotsByDate: Record<string, SlotEntry[]> = {};
  for (const s of availSlots) {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  }

  const inputClass = "w-full border border-[#E2DDD6] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#C8C0B8] focus:outline-none focus:border-[#1A1A1A] transition-colors";
  const labelClass = "block text-[10px] tracking-[0.15em] uppercase text-[#A09890] mb-1.5";

  /* ── Session check ────────────────────────────── */
  if (authChecking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--noema-bg)" }}>
      <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  /* ── Login ────────────────────────────────────── */
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--noema-bg)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <p className="text-3xl font-light tracking-[0.4em] text-[#1A1A1A] uppercase" style={{ fontFamily: "var(--font-cormorant), serif" }}>Noema</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#A09890]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>Admin panel</p>
        </div>
        <div className="h-px bg-[#E2DDD6]" />
        <form onSubmit={login} className="space-y-5">
          <div>
            <label className={labelClass} style={{ fontFamily: "var(--font-inter), sans-serif" }}>Lozinka</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className={inputClass} style={{ fontFamily: "var(--font-inter), sans-serif" }} placeholder="••••••••" autoFocus />
          </div>
          {loginError && <p className="text-xs text-red-500">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full py-3.5 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors">
            {loginLoading ? "Prijavljujem…" : "Prijavi se"}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── Dashboard ────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--noema-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#E2DDD6] bg-white">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-light tracking-[0.35em] uppercase text-[#1A1A1A]" style={{ fontFamily: "var(--font-cormorant), serif" }}>Noema</span>
            <span className="text-[9px] tracking-[0.15em] uppercase text-[#C8C0B8]">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden sm:inline text-[11px] text-[#A09890] hover:text-[#1A1A1A] transition-colors tracking-wide whitespace-nowrap">← Klijentska stranica</Link>
            <button onClick={sendReminders} disabled={sendingReminders} className="hidden sm:inline text-xs tracking-[0.1em] border border-[#E2DDD6] px-4 py-2 text-[#6B6560] hover:bg-[#F5F0EB] disabled:opacity-40 transition-colors whitespace-nowrap">{sendingReminders ? "Šaljem…" : "Pošalji podsjetnike"}</button>
            <button onClick={logout} className="text-xs tracking-[0.1em] border border-[#E2DDD6] px-4 py-2 text-[#6B6560] hover:bg-[#F5F0EB] transition-colors">Odjava</button>
          </div>
        </div>
        <div className="sm:hidden border-t border-[#E2DDD6] px-4 py-2 flex items-center gap-4">
          <Link href="/" className="text-[11px] text-[#A09890] hover:text-[#1A1A1A] transition-colors tracking-wide">← Klijentska stranica</Link>
          <span className="text-[#E2DDD6] select-none">·</span>
          <button onClick={sendReminders} disabled={sendingReminders} className="text-[11px] text-[#A09890] hover:text-[#1A1A1A] disabled:opacity-40 transition-colors tracking-wide">{sendingReminders ? "Šaljem…" : "Pošalji podsjetnike"}</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex border-b border-[#E2DDD6] mb-8 overflow-x-auto">
          {(["bookings", "availability", "settings", "postavke"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={[
                "px-4 sm:px-6 py-3 text-xs tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px whitespace-nowrap",
                tab === t ? "border-[#1A1A1A] text-[#1A1A1A]" : "border-transparent text-[#A09890] hover:text-[#6B6560]",
              ].join(" ")}
            >
              {t === "bookings" ? "Rezervacije" : t === "availability" ? "Dostupnost" : t === "settings" ? "Obavijesti" : "Postavke"}
            </button>
          ))}
        </div>

        {/* ── Rezervacije ───────────────────────────── */}
        {tab === "bookings" && (() => {
          const byDate: Record<string, BookingEntry[]> = {};
          for (const b of bookings) {
            if (!byDate[b.date]) byDate[b.date] = [];
            byDate[b.date].push(b);
          }
          const dateKeys = Object.keys(byDate).sort();

          const byWeek: Record<string, string[]> = {};
          for (const date of dateKeys) {
            const wk = getMondayStr(date);
            if (!byWeek[wk]) byWeek[wk] = [];
            byWeek[wk].push(date);
          }
          const weekKeys = Object.keys(byWeek).sort();

          function toggleDate(date: string) {
            setExpandedDates(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
          }

          const chevron = (open: boolean) => (
            <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          );

          return (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560]">Nadolazeće rezervacije</h2>
                <button onClick={fetchBookings} className="text-xs text-[#A09890] hover:text-[#1A1A1A] transition-colors">↻ Osvježi</button>
              </div>
              {bookingsError && (
                <div className="bg-red-50 border border-red-200 px-4 py-3 mb-4">
                  <p className="text-xs text-red-600">{bookingsError}</p>
                </div>
              )}
              {bookingsLoading ? (
                <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" /></div>
              ) : bookings.length === 0 ? (
                <div className="bg-white border border-[#E2DDD6] p-12 text-center"><p className="text-sm text-[#C8C0B8]">Nema nadolazećih rezervacija.</p></div>
              ) : (
                <div className="space-y-6">
                  {weekKeys.map(wk => (
                    <div key={wk}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-[#E2DDD6]" />
                        <span className="text-[10px] tracking-[0.2em] uppercase text-[#A09890] shrink-0">
                          Tjedan {formatWeekRange(wk, true)}
                        </span>
                        <div className="flex-1 h-px bg-[#E2DDD6]" />
                      </div>
                      <div className="space-y-2">
                        {byWeek[wk].map(date => {
                          const [y, m, d] = date.split("-").map(Number);
                          const group = byDate[date];
                          const isCollapsed = expandedDates.has(date);
                          const count = group.length;
                          const countLabel = count === 1 ? "1 rezervacija" : count < 5 ? `${count} rezervacije` : `${count} rezervacija`;
                          const weekdayName = WEEKDAYS_FULL[new Date(y, m - 1, d).getDay()].toUpperCase();
                          const dateLabel = `${d}. ${MONTHS_GEN[m - 1]} ${y}.`;
                          return (
                            <div key={date} className="border border-[#E2DDD6] bg-white overflow-hidden">
                              <button onClick={() => toggleDate(date)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAF8] transition-colors">
                                <div>
                                  <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#1A1A1A]">{weekdayName}</p>
                                  <p className="text-sm font-light text-[#6B6560] mt-0.5" style={{ fontFamily: "var(--font-cormorant), serif" }}>{dateLabel}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] tracking-[0.1em] border border-[#E2DDD6] px-2 py-0.5 text-[#6B6560]">{countLabel}</span>
                                  {chevron(!isCollapsed)}
                                </div>
                              </button>
                              {!isCollapsed && (
                                <div className="border-t border-[#E2DDD6] divide-y divide-[#E2DDD6]">
                                  {group.sort((a, b) => a.startHour - b.startHour).map(b => (
                                    <div key={b.id} className="flex items-center gap-4 px-5 py-3 bg-[#FAFAF8]">
                                      <div className="shrink-0 w-14 text-center">
                                        <p className="text-xl font-light text-[#1A1A1A]" style={{ fontFamily: "var(--font-cormorant), serif" }}>{pad(b.startHour)}:00</p>
                                        <p className="text-[9px] tracking-[0.1em] uppercase text-[#C8C0B8]">{b.people === 2 ? "2 os." : "1 os."}</p>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{b.name}</p>
                                        <p className="text-xs text-[#A09890] truncate mt-0.5">{b.email}</p>
                                        <p className="text-xs text-[#A09890] mt-0.5">{b.phone}</p>
                                      </div>
                                      <button type="button" onClick={() => deleteBooking(b.id)} disabled={deletingBooking === b.id}
                                        className="shrink-0 text-[#C8C0B8] hover:text-red-400 disabled:opacity-40 transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center">
                                        {deletingBooking === b.id
                                          ? <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        }
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Dostupnost ────────────────────────────── */}
        {tab === "availability" && (() => {
          const weekDates = getWeekDates(weekOffset);

          const weekNav = (
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DDD6]">
              <button type="button" onClick={() => changeWeek(-1)}
                className="w-8 h-8 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors text-lg">
                ‹
              </button>
              <span className="text-xs tracking-[0.12em] text-[#1A1A1A]">
                Tjedan {formatWeekLabel(weekOffset)}
              </span>
              <button type="button" onClick={() => changeWeek(1)}
                className="w-8 h-8 flex items-center justify-center text-[#A09890] hover:text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors text-lg">
                ›
              </button>
            </div>
          );

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* ── Left: add slots by week ── */}
              <div className="bg-white border border-[#E2DDD6]">
                <div className="px-5 pt-5 pb-0">
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560] mb-4">Dodaj termine</h3>
                </div>
                {weekNav}

                <form onSubmit={addWeekSlots}>
                  <div className="divide-y divide-[#E2DDD6]">
                    {weekDates.map((dateStr, i) => {
                      const isPast = dateStr < todayStr;
                      const isChecked = checkedDays.has(i);
                      const config = dayConfigs[i] ?? { from: "9", to: "17", maxSpots: "3" };
                      const [, m, d] = dateStr.split("-").map(Number);
                      return (
                        <div key={dateStr}>
                          <label className={[
                            "flex items-center gap-3 px-5 py-3 select-none transition-colors",
                            isPast ? "opacity-40" : "cursor-pointer hover:bg-[#FAFAF8]",
                          ].join(" ")}>
                            <input type="checkbox" disabled={isPast} checked={isChecked}
                              onChange={() => toggleCheckedDay(i)}
                              className="w-4 h-4 accent-[#1A1A1A] shrink-0" />
                            <span className="text-sm font-medium text-[#1A1A1A] flex-1">{DAYS_FULL[i]}</span>
                            <span className="text-xs text-[#A09890]">{d}.{m}.</span>
                          </label>
                          {isChecked && (
                            <div className="flex items-center gap-4 px-5 pb-3 pt-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-[#A09890] w-4">Od</span>
                                <input type="number" min="0" max="23" value={config.from}
                                  onChange={e => updateDayConfig(i, "from", e.target.value)}
                                  className="w-14 border border-[#E2DDD6] px-2 py-1.5 text-sm text-[#1A1A1A] text-center focus:outline-none focus:border-[#1A1A1A] transition-colors" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-[#A09890] w-4">Do</span>
                                <input type="number" min="1" max="24" value={config.to}
                                  onChange={e => updateDayConfig(i, "to", e.target.value)}
                                  className="w-14 border border-[#E2DDD6] px-2 py-1.5 text-sm text-[#1A1A1A] text-center focus:outline-none focus:border-[#1A1A1A] transition-colors" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-[#A09890] shrink-0">Mj.</span>
                                <input type="number" min="1" max="20" value={config.maxSpots}
                                  onChange={e => updateDayConfig(i, "maxSpots", e.target.value)}
                                  className="w-14 border border-[#E2DDD6] px-2 py-1.5 text-sm text-[#1A1A1A] text-center focus:outline-none focus:border-[#1A1A1A] transition-colors" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {addError   && <p className="text-xs text-red-500">{addError}</p>}
                    {addSuccess && <p className="text-xs text-emerald-600">{addSuccess}</p>}
                    <button type="submit" disabled={addingSlots || checkedDays.size === 0}
                      className="w-full py-3 bg-[#1A1A1A] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors">
                      {addingSlots ? "Dodajem…" : "Dodaj termine"}
                    </button>
                  </div>
                </form>
              </div>

              {/* ── Right: view & edit slots for this week ── */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-[#6B6560]">
                    Termini — {formatWeekLabel(weekOffset)}
                  </h3>
                  <button onClick={fetchSlots} className="text-xs text-[#A09890] hover:text-[#1A1A1A] transition-colors">↻</button>
                </div>

                <div className="space-y-1.5">
                  {weekDates.map((dateStr, i) => {
                    const slots = (slotsByDate[dateStr] ?? []).slice().sort((a, b) => a.startHour - b.startHour);
                    const isOpen = expandedDays.has(dateStr);
                    const isPast = dateStr < todayStr;
                    const [, m, d] = dateStr.split("-").map(Number);
                    const hasSlots = slots.length > 0;

                    return (
                      <div key={dateStr} className="border border-[#E2DDD6] overflow-hidden bg-white">
                        <div className="flex items-center">
                        <button type="button"
                          onClick={() => {
                            if (!hasSlots) return;
                            setExpandedDays(prev => { const n = new Set(prev); n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr); return n; });
                          }}
                          className={[
                            "flex-1 flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            hasSlots ? "hover:bg-[#FAFAF8] cursor-pointer" : "cursor-default",
                          ].join(" ")}>
                          <span className={`text-sm font-medium w-28 shrink-0 ${isPast ? "text-[#C8C0B8]" : "text-[#1A1A1A]"}`}>
                            {DAYS_FULL[i]}
                          </span>
                          <span className={`text-xs ${isPast ? "text-[#D0CAC3]" : "text-[#A09890]"}`}>{d}.{m}.</span>
                          <div className="flex-1" />
                          {hasSlots ? (
                            <>
                              <span className="text-[10px] text-[#A09890] border border-[#E2DDD6] px-1.5 py-0.5 shrink-0">
                                {slots.length} {slots.length === 1 ? "termin" : "termina"}
                              </span>
                              <svg className={`w-3.5 h-3.5 text-[#A09890] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#D0CAC3]">—</span>
                          )}
                        </button>
                        {hasSlots && (
                          <button type="button"
                            onClick={() => deleteDaySlots(dateStr, slots, `${DAYS_FULL[i]} ${d}.${m}.`)}
                            disabled={deletingDay === dateStr}
                            className="shrink-0 text-[#C8C0B8] hover:text-red-400 disabled:opacity-40 transition-colors p-1.5 pr-3">
                            {deletingDay === dateStr
                              ? <div className="w-3.5 h-3.5 border border-red-300 border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            }
                          </button>
                        )}
                        </div>

                        {isOpen && hasSlots && (
                          <div className="border-t border-[#E2DDD6] divide-y divide-[#E2DDD6]">
                            {slots.map(s => (
                              <div key={s.id} className="flex items-center gap-2 px-4 py-2.5">
                                <span className="text-sm text-[#1A1A1A] shrink-0 w-28">{formatHour(s.startHour)}</span>
                                <span className="text-xs text-[#A09890] flex-1 shrink-0">
                                  {s.booked} / {s.maxSpots}
                                  {s.booked >= s.maxSpots && <span className="text-[#C8A090] ml-1">· puno</span>}
                                </span>
                                {/* +/- max spots */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button type="button"
                                    onClick={() => updateMaxSpots(s.id, s.maxSpots - 1)}
                                    disabled={s.maxSpots <= 1 || savingSlot === s.id}
                                    className="w-6 h-6 flex items-center justify-center border border-[#E2DDD6] text-[#6B6560] text-sm hover:bg-[#F5F0EB] disabled:opacity-30 transition-colors">
                                    −
                                  </button>
                                  <span className={`w-7 text-center text-sm select-none ${savingSlot === s.id ? "text-[#C8C0B8]" : "text-[#1A1A1A]"}`}>
                                    {s.maxSpots}
                                  </span>
                                  <button type="button"
                                    onClick={() => updateMaxSpots(s.id, s.maxSpots + 1)}
                                    disabled={savingSlot === s.id}
                                    className="w-6 h-6 flex items-center justify-center border border-[#E2DDD6] text-[#6B6560] text-sm hover:bg-[#F5F0EB] disabled:opacity-30 transition-colors">
                                    +
                                  </button>
                                </div>
                                {/* delete */}
                                <button type="button"
                                  onClick={() => deleteSlot(s.id)}
                                  disabled={deletingSlot === s.id}
                                  className="shrink-0 text-[#C8C0B8] hover:text-red-400 disabled:opacity-40 transition-colors p-1.5">
                                  {deletingSlot === s.id
                                    ? <div className="w-3.5 h-3.5 border border-red-300 border-t-transparent rounded-full animate-spin" />
                                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                  }
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── Obavijesti ────────────────────────────── */}
        {tab === "settings" && (
          <div className="max-w-lg">
            <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560] mb-6">Obavijesti za klijente</h2>
            <form onSubmit={saveInstructions} className="space-y-5">
              <div className="bg-white border border-[#E2DDD6] p-5 space-y-4">
                <p className="text-xs text-[#6B6560] leading-relaxed">
                  Tekst se prikazuje klijentima između pozdravne poruke i kalendara. Svaki red bit će prikazan kao zasebna napomena.
                </p>
                <div>
                  <label className={labelClass}>Tekst obavijesti</label>
                  <textarea rows={6} value={instructions}
                    onChange={e => { setInstructions(e.target.value); setInstructionsSaved(false); }}
                    placeholder={"Donesite osobnu iskaznicu\nParking dostupan na ulici\nMolimo javite se 5 minuta ranije"}
                    className="w-full border border-[#E2DDD6] bg-[#FAFAF8] px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#C8C0B8] focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none"
                  />
                </div>
              </div>
              {instructions.trim() && (
                <div className="border border-[#E2DDD6] p-5 space-y-2" style={{ background: "var(--noema-cream)" }}>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#A09890] mb-3">Pregled (kako vide klijenti)</p>
                  {instructions.split("\n").filter(l => l.trim()).map((line, i) => (
                    <p key={i} className="text-sm text-[#6B6560]">— {line.trim()}</p>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                <button type="submit" disabled={instructionsSaving}
                  className="px-8 py-3 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors">
                  {instructionsSaving ? "Spremam…" : "Spremi"}
                </button>
                {instructionsSaved && <span className="text-xs text-emerald-600">✓ Obavijesti su spremljene</span>}
                {instructionsError && <span className="text-xs text-red-600">{instructionsError}</span>}
              </div>
            </form>
          </div>
        )}

        {/* ── Postavke ──────────────────────────────── */}
        {tab === "postavke" && (
          <div className="max-w-lg space-y-10">
            <div>
              <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560] mb-6">Promjena lozinke</h2>
              <form onSubmit={changePassword} className="bg-white border border-[#E2DDD6] p-5 space-y-4">
                <div>
                  <label className={labelClass}>Trenutna lozinka</label>
                  <input type="password" required value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className={inputClass} placeholder="••••••••" />
                </div>
                <div>
                  <label className={labelClass}>Nova lozinka</label>
                  <input type="password" required value={newPwd}
                    onChange={e => { setNewPwd(e.target.value); setPwdResult(null); }} className={inputClass} placeholder="••••••••" />
                </div>
                <div>
                  <label className={labelClass}>Potvrdi novu lozinku</label>
                  <input type="password" required value={confirmPwd}
                    onChange={e => { setConfirmPwd(e.target.value); setPwdResult(null); }} className={inputClass} placeholder="••••••••" />
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <button type="submit" disabled={pwdSaving}
                    className="px-8 py-3 bg-[#1A1A1A] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#333] disabled:opacity-40 transition-colors">
                    {pwdSaving ? "Spremam…" : "Spremi lozinku"}
                  </button>
                  {pwdResult && (
                    <span className={`text-xs tracking-wide ${pwdResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {pwdResult.ok ? "✓ " : ""}{pwdResult.msg}
                    </span>
                  )}
                </div>
              </form>
            </div>
            <div>
              <h2 className="text-xs tracking-[0.2em] uppercase text-[#6B6560] mb-6">Čišćenje starih podataka</h2>
              <div className="bg-white border border-[#E2DDD6] p-5 space-y-4">
                <p className="text-xs text-[#6B6560] leading-relaxed">
                  Briše termine i rezervacije starije od 30 dana. Automatski se izvršava svaki dan pri slanju podsjetnika.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={runCleanup} disabled={cleanupRunning}
                    className="px-8 py-3 border border-[#E2DDD6] text-[#6B6560] text-xs tracking-[0.2em] uppercase hover:bg-[#F5F0EB] disabled:opacity-40 transition-colors">
                    {cleanupRunning ? "Čistim…" : "Očisti stare rezervacije"}
                  </button>
                  {cleanupResult && <span className="text-xs text-[#6B6560]">{cleanupResult}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
