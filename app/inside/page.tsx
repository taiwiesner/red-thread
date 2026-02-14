"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { Noto_Serif, Parisienne } from "next/font/google";

const bodyFont = Noto_Serif({ subsets: ["latin"], weight: ["400", "600"] });
const fancy = Parisienne({ subsets: ["latin"], weight: ["400"] });

type Post = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

type LoveNote = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
};

type Todo = {
  id: string;
  text: string;
  done: boolean;
  created_at: string;
};

type PinnedRow = {
  id: string; // "keya" | "tai"
  body: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_date: string; // "YYYY-MM-DD"
  created_at: string;
};

function daysBetween(a: Date, b: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((B.getTime() - A.getTime()) / oneDay);
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{
    day: number | null;
    iso?: string;
    isToday?: boolean;
  }> = [];

  for (let i = 0; i < startDay; i++) cells.push({ day: null });

  const today = new Date();
  const tY = today.getFullYear();
  const tM = today.getMonth();
  const tD = today.getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = yyyyMmDd(new Date(year, month, d));
    cells.push({ day: d, iso, isToday: year === tY && month === tM && d === tD });
  }

  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export default function Inside() {
  const [tab, setTab] = useState<"memories" | "notes" | "list" | "milestones">(
    "memories"
  );

  // Memories
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Love Notes
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  // Todos
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoText, setTodoText] = useState("");

  // Pinned notes
  const [keyaNote, setKeyaNote] = useState("");
  const [taiNote, setTaiNote] = useState("");
  const [pinSaved, setPinSaved] = useState("");

  // Events
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => yyyyMmDd(new Date()));

  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Spotify
  const spotifyUrl =
    "https://open.spotify.com/playlist/3ytkKbz8DTVpWtod4RxzAF?si=aed292895d3842f0";

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Dates
  const metDate = useMemo(() => new Date(2025, 9, 5), []); // Oct 5, 2025
  const togetherDate = useMemo(() => new Date(2025, 10, 20), []); // Nov 20, 2025
  const today = new Date();

  const daysSinceMet = daysBetween(metDate, today);
  const daysTogether = daysBetween(togetherDate, today);

  // Month grid for the cursor month
  const monthCells = useMemo(
    () => buildMonthGrid(monthCursor),
    [monthCursor.getFullYear(), monthCursor.getMonth()]
  );

  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Loads
  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return setMsg(error.message);
    setPosts((data as Post[]) ?? []);
  }

  async function loadNotes() {
    const { data, error } = await supabase
      .from("love_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return setMsg(error.message);
    setNotes((data as LoveNote[]) ?? []);
  }

  async function loadTodos() {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return setMsg(error.message);
    setTodos((data as Todo[]) ?? []);
  }

  async function loadPinned() {
    const { data, error } = await supabase.from("pinned_notes").select("id, body");
    if (error) return;

    const rows = (data as PinnedRow[]) ?? [];
    const k = rows.find((r) => r.id === "keya");
    const t = rows.find((r) => r.id === "tai");

    setKeyaNote(k?.body ?? "");
    setTaiNote(t?.body ?? "");
  }

  // ✅ next 5 upcoming events (rule stays the same)
  async function loadNextEvents() {
    const todayStr = yyyyMmDd(new Date());
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true })
      .limit(5);

    if (error) return setMsg(error.message);
    setEvents((data as EventRow[]) ?? []);
  }

  useEffect(() => {
    loadPosts();
    loadNotes();
    loadTodos();
    loadPinned();
    loadNextEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mutations
  async function addPost(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    let image_url: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
      if (upErr) return setMsg(upErr.message);

      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      image_url = data.publicUrl;
    }

    const { error } = await supabase.from("posts").insert({
      title: title || null,
      body: body || null,
      image_url,
    });

    if (error) return setMsg(error.message);

    setTitle("");
    setBody("");
    setFile(null);
    setMsg("Saved.");
    await loadPosts();
  }

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

  async function deletePost(p: Post) {
    const ok = confirm("Delete this memory?");
    if (!ok) return;

    setMsg("");
    setBusyId(p.id);

    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) {
      setBusyId(null);
      return setMsg(error.message);
    }

    if (p.image_url) {
      const path = getStoragePathFromPublicUrl(p.image_url);
      if (path) await supabase.storage.from("photos").remove([path]);
    }

    setBusyId(null);
    setMsg("Deleted.");
    await loadPosts();
  }

  async function addLoveNote(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.from("love_notes").insert({
      title: noteTitle || null,
      body: noteBody || null,
    });

    if (error) return setMsg(error.message);

    setNoteTitle("");
    setNoteBody("");
    setMsg("Saved.");
    await loadNotes();
  }

  async function deleteLoveNote(n: LoveNote) {
    const ok = confirm("Delete this love note?");
    if (!ok) return;

    setMsg("");
    setBusyId(n.id);

    const { error } = await supabase.from("love_notes").delete().eq("id", n.id);
    if (error) {
      setBusyId(null);
      return setMsg(error.message);
    }

    setBusyId(null);
    setMsg("Deleted.");
    await loadNotes();
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!todoText.trim()) return;

    const { error } = await supabase.from("todos").insert({ text: todoText.trim() });
    if (error) return setMsg(error.message);

    setTodoText("");
    await loadTodos();
  }

  async function toggleTodo(t: Todo) {
    setMsg("");
    const { error } = await supabase.from("todos").update({ done: !t.done }).eq("id", t.id);
    if (error) return setMsg(error.message);
    await loadTodos();
  }

  async function deleteTodo(t: Todo) {
    const ok = confirm("Remove this item?");
    if (!ok) return;

    setMsg("");
    setBusyId(t.id);

    const { error } = await supabase.from("todos").delete().eq("id", t.id);
    if (error) {
      setBusyId(null);
      return setMsg(error.message);
    }

    setBusyId(null);
    await loadTodos();
  }

  async function savePinned(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setPinSaved("");

    const { error } = await supabase.from("pinned_notes").upsert([
      { id: "keya", body: keyaNote, updated_at: new Date().toISOString() },
      { id: "tai", body: taiNote, updated_at: new Date().toISOString() },
    ]);

    if (error) return setMsg(error.message);

    setPinSaved("Saved.");
    setTimeout(() => setPinSaved(""), 1500);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!eventTitle.trim()) return setMsg("Event title is required.");

    const { error } = await supabase.from("events").insert({
      title: eventTitle.trim(),
      event_date: selectedDate,
    });

    if (error) return setMsg(error.message);

    setEventTitle("");
    setMsg("Event saved.");
    await loadNextEvents();
  }

  async function deleteEvent(ev: EventRow) {
    const ok = confirm("Delete this event?");
    if (!ok) return;

    setMsg("");
    setBusyId(ev.id);

    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) {
      setBusyId(null);
      return setMsg(error.message);
    }

    setBusyId(null);
    setMsg("Event deleted.");
    await loadNextEvents();
  }

  // Milestones
  const milestones = useMemo(() => {
    const base = togetherDate;
    const mk = (label: string, d: Date) => ({
      label,
      date: d,
      daysLeft: daysBetween(today, d),
      passed:
        d.getTime() <
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(),
    });

    const addDays = (n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
    const addMonths = (n: number) => new Date(base.getFullYear(), base.getMonth() + n, base.getDate());
    const addYears = (n: number) => new Date(base.getFullYear() + n, base.getMonth(), base.getDate());

    return [mk("100 days", addDays(100)), mk("6 months", addMonths(6)), mk("1 year", addYears(1))];
  }, [togetherDate, today]);

  return (
    <main className={`${bodyFont.className} min-h-screen text-[#F8EDEB]`}>
      {/* Background (unchanged) */}
      <div className="fixed inset-0 bg-[#4E0707]" />
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: "url(/cheetah-red.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          opacity: 0.35,
        }}
      />
      <div className="fixed inset-0 bg-black/40" />

      <div className="relative px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`${fancy.className} text-5xl leading-none`}>Red Thread</h1>
              <p className="mt-3 max-w-2xl opacity-85 leading-relaxed text-sm">
                We tried apps for couples and we always stopped using them. So I decided to make this for us - a space we
                can build together. And also because you love keeping things organized.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-sm border border-[#F8EDEB]/35 px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
            >
              Back
            </Link>
          </div>

          {/* TOP: two equal cards (smaller) */}
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            {/* LEFT: calendar + events */}
            <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Calendar</div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
                    }
                    className="rounded-sm border border-[#F8EDEB]/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
                    }
                    className="rounded-sm border border-[#F8EDEB]/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-2 text-sm opacity-90">{monthLabel}</div>
              <div className="mt-1 text-xs opacity-75">{formatDateLong(today)}</div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] opacity-90">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="opacity-60 tracking-[0.2em]">
                    {d}
                  </div>
                ))}

                {monthCells.map((c, i) => {
                  const isSelected = c.iso && c.iso === selectedDate;

                  if (!c.day) {
                    return (
                      <div key={i} className="rounded-md py-1 border border-[#F8EDEB]/10 bg-black/10" />
                    );
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => c.iso && setSelectedDate(c.iso)}
                      className={`rounded-md py-1 border border-[#F8EDEB]/10 transition ${
                        c.isToday
                          ? "bg-[#F8EDEB] text-[#4E0707] border-[#F8EDEB]"
                          : isSelected
                          ? "bg-[#F8EDEB]/25 border-[#F8EDEB]/45"
                          : "bg-black/10 hover:bg-[#F8EDEB]/10"
                      }`}
                      title={c.iso}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>

              {/* Events */}
              <div className="mt-4 border-t border-[#F8EDEB]/12 pt-3">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Next events</div>

                <div className="mt-3 grid gap-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-md border border-[#F8EDEB]/15 bg-black/10 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm">{ev.title}</div>
                          <div className="text-[11px] opacity-70">
                            {new Date(ev.event_date).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteEvent(ev)}
                          disabled={busyId === ev.id}
                          className="rounded-sm border border-[#F8EDEB]/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition disabled:opacity-40"
                        >
                          {busyId === ev.id ? "..." : "Del"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {events.length === 0 && <div className="text-sm opacity-75">No upcoming events yet.</div>}
                </div>

                {/* Add event (date is selected from calendar) */}
                <form onSubmit={addEvent} className="mt-3 grid gap-2">
                  <div className="text-[11px] opacity-70">
                    Adding to:{" "}
                    <span className="opacity-90">{new Date(selectedDate).toLocaleDateString()}</span>
                  </div>

                  <input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Event title"
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <button
                    type="submit"
                    className="rounded-sm border border-[#F8EDEB]/35 px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Add
                  </button>
                </form>
              </div>
            </section>

            {/* RIGHT: countdown + pinned + spotify below */}
            <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-4">
              <div className="text-xs uppercase tracking-[0.25em] opacity-75">Dashboard</div>

              <div className="mt-3 grid gap-3">
                <div className="rounded-md border border-[#F8EDEB]/15 bg-black/10 px-3 py-3">
                  <div className="text-xs uppercase tracking-[0.25em] opacity-75">Days since we met</div>
                  <div className="mt-1 text-3xl font-semibold">{daysSinceMet}</div>
                  <div className="text-xs opacity-70">Since Oct 5, 2025</div>
                </div>

                <div className="rounded-md border border-[#F8EDEB]/15 bg-black/10 px-3 py-3">
                  <div className="text-xs uppercase tracking-[0.25em] opacity-75">Days together</div>
                  <div className="mt-1 text-3xl font-semibold">{daysTogether}</div>
                  <div className="text-xs opacity-70">Since Nov 20, 2025</div>
                </div>
              </div>

              {/* Pinned notes */}
              <div className="mt-4 border-t border-[#F8EDEB]/12 pt-3">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Pinned Notes</div>

                <form onSubmit={savePinned} className="mt-3 grid gap-3">
                  <div>
                    <div className="text-sm mb-1 opacity-80">Keya</div>
                    <textarea
                      value={keyaNote}
                      onChange={(e) => setKeyaNote(e.target.value)}
                      placeholder="Keya's pinned note…"
                      rows={3}
                      className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                    />
                  </div>

                  <div>
                    <div className="text-sm mb-1 opacity-80">Tai</div>
                    <textarea
                      value={taiNote}
                      onChange={(e) => setTaiNote(e.target.value)}
                      placeholder="Tai's pinned note…"
                      rows={3}
                      className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="rounded-sm border border-[#F8EDEB]/35 px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                    >
                      Save
                    </button>

                    {pinSaved && <span className="text-sm opacity-80">{pinSaved}</span>}
                  </div>
                </form>

                {/* Spotify moved BELOW notes */}
                <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-sm border border-[#F8EDEB]/35 px-4 py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                >
                  Open our Spotify playlist
                </a>
              </div>
            </section>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              ["memories", "Memories"],
              ["notes", "Love Notes"],
              ["list", "To-do list"],
              ["milestones", "Milestones"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-[0.25em] transition ${
                  tab === k
                    ? "bg-[#F8EDEB] text-[#4E0707] border-[#F8EDEB]"
                    : "border-[#F8EDEB]/35 hover:bg-[#F8EDEB] hover:text-[#4E0707]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {msg && <div className="mt-4 text-sm opacity-85">{msg}</div>}

          {/* TAB: Memories */}
          {tab === "memories" && (
            <div className="mt-6 grid gap-6">
              <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Add a memory</div>

                <form onSubmit={addPost} className="mt-4 grid gap-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write something…"
                    rows={5}
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-3">
                      <span className="rounded-sm border border-[#F8EDEB]/35 px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition cursor-pointer">
                        Choose photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <span className="text-xs opacity-70">{file ? file.name : "optional"}</span>
                    </label>

                    <button
                      type="submit"
                      className="rounded-sm border border-[#F8EDEB]/35 px-5 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                    >
                      Post
                    </button>
                  </div>

                  {previewUrl && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-[#F8EDEB]/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="" className="w-full max-h-[420px] object-cover" />
                    </div>
                  )}
                </form>
              </section>

              <section className="grid gap-6">
                {posts.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.25em] opacity-65">
                            {new Date(p.created_at).toLocaleString()}
                          </div>
                          <div className="mt-2 text-2xl">{p.title ?? "Untitled"}</div>
                        </div>

                        <button
                          onClick={() => deletePost(p)}
                          disabled={busyId === p.id}
                          className="rounded-sm border border-[#F8EDEB]/30 px-3 py-2 text-xs uppercase tracking-[0.22em] opacity-85 hover:bg-[#F8EDEB] hover:text-[#4E0707] transition disabled:opacity-40"
                        >
                          {busyId === p.id ? "Deleting" : "Delete"}
                        </button>
                      </div>

                      {p.body && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{p.body}</p>}
                    </div>

                    {p.image_url && (
                      <div className="border-t border-[#F8EDEB]/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt="" className="w-full max-h-[520px] object-cover" />
                      </div>
                    )}
                  </article>
                ))}

                {posts.length === 0 && (
                  <div className="rounded-xl border border-[#F8EDEB]/18 bg-black/10 p-6 opacity-80">
                    No memories yet. Add the first one above.
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB: Love Notes */}
          {tab === "notes" && (
            <div className="mt-6 grid gap-6">
              <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Add a love note</div>

                <form onSubmit={addLoveNote} className="mt-4 grid gap-3">
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Write a note…"
                    rows={7}
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <button
                    type="submit"
                    className="justify-self-start rounded-sm border border-[#F8EDEB]/35 px-5 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Save
                  </button>
                </form>
              </section>

              <section className="grid gap-6">
                {notes.map((n) => (
                  <article
                    key={n.id}
                    className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] opacity-65">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                        <div className="mt-2 text-2xl">{n.title ?? "Love Note"}</div>
                      </div>

                      <button
                        onClick={() => deleteLoveNote(n)}
                        disabled={busyId === n.id}
                        className="rounded-sm border border-[#F8EDEB]/30 px-3 py-2 text-xs uppercase tracking-[0.22em] opacity-85 hover:bg-[#F8EDEB] hover:text-[#4E0707] transition disabled:opacity-40"
                      >
                        {busyId === n.id ? "Deleting" : "Delete"}
                      </button>
                    </div>

                    {n.body && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{n.body}</p>}
                  </article>
                ))}

                {notes.length === 0 && (
                  <div className="rounded-xl border border-[#F8EDEB]/18 bg-black/10 p-6 opacity-80">
                    No love notes yet.
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB: To-do list */}
          {tab === "list" && (
            <div className="mt-6 grid gap-6">
              <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Add an item</div>

                <form onSubmit={addTodo} className="mt-4 flex gap-3">
                  <input
                    value={todoText}
                    onChange={(e) => setTodoText(e.target.value)}
                    placeholder="ideas, trips, dates…"
                    className="flex-1 rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />

                  <button
                    type="submit"
                    className="rounded-sm border border-[#F8EDEB]/35 px-5 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Add
                  </button>
                </form>
              </section>

              <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Checklist</div>

                <div className="mt-4 grid gap-3">
                  {todos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[#F8EDEB]/15 bg-black/10 px-4 py-3"
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTodo(t)}
                          className="h-4 w-4"
                        />
                        <span className={t.done ? "line-through opacity-60" : ""}>{t.text}</span>
                      </label>

                      <button
                        onClick={() => deleteTodo(t)}
                        disabled={busyId === t.id}
                        className="rounded-sm border border-[#F8EDEB]/30 px-3 py-2 text-xs uppercase tracking-[0.22em] opacity-85 hover:bg-[#F8EDEB] hover:text-[#4E0707] transition disabled:opacity-40"
                      >
                        {busyId === t.id ? "…" : "Remove"}
                      </button>
                    </div>
                  ))}

                  {todos.length === 0 && <div className="opacity-80">No items yet.</div>}
                </div>
              </section>
            </div>
          )}

          {/* TAB: Milestones */}
          {tab === "milestones" && (
            <div className="mt-6 grid gap-6">
              <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">Milestones</div>

                <div className="mt-4 grid gap-3">
                  {milestones.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-md border border-[#F8EDEB]/15 bg-black/10 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg">{m.label}</div>
                        <span className="text-xs uppercase tracking-[0.25em] opacity-70">
                          {m.date.toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-2 text-sm opacity-85">
                        {m.passed ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="rounded-full border border-[#F8EDEB]/30 px-3 py-1 text-xs uppercase tracking-[0.25em]">
                              ✓ passed
                            </span>
                            <span className="opacity-75">We already hit this.</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="rounded-full border border-[#F8EDEB]/30 px-3 py-1 text-xs uppercase tracking-[0.25em]">
                              {m.daysLeft} days
                            </span>
                            <span className="opacity-75">until this milestone.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
