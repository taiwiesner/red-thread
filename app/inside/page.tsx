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

function buildMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number | null; isToday?: boolean }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: null });

  const today = new Date();
  const tY = today.getFullYear();
  const tM = today.getMonth();
  const tD = today.getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isToday: year === tY && month === tM && d === tD });
  }

  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export default function Inside() {
  const [tab, setTab] = useState<"memories" | "notes" | "list" | "milestones">(
    "memories"
  );

  // Memories (posts + photos)
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Love Notes
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  // Checklist
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoText, setTodoText] = useState("");

  // Pinned notes
  const [keyaNote, setKeyaNote] = useState("");
  const [taiNote, setTaiNote] = useState("");
  const [pinSaved, setPinSaved] = useState("");

  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // ✅ Put your real Spotify playlist link here
  const spotifyUrl =
    "https://open.spotify.com/playlist/3ytkKbz8DTVpWtod4RxzAF?si=aed292895d3842f0";

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

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

  const monthCells = useMemo(
    () => buildMonthGrid(today),
    [today.getFullYear(), today.getMonth(), today.getDate()]
  );

  const monthLabel = today.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }

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
    const { data, error } = await supabase
      .from("pinned_notes")
      .select("id, body");

    if (error) return;

    const rows = (data as PinnedRow[]) ?? [];
    const k = rows.find((r) => r.id === "keya");
    const t = rows.find((r) => r.id === "tai");

    setKeyaNote(k?.body ?? "");
    setTaiNote(t?.body ?? "");
  }

  useEffect(() => {
    loadPosts();
    loadNotes();
    loadTodos();
    loadPinned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addPost(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    let image_url: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file);

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

    const { error } = await supabase
      .from("todos")
      .insert({ text: todoText.trim() });

    if (error) return setMsg(error.message);

    setTodoText("");
    await loadTodos();
  }

  async function toggleTodo(t: Todo) {
    setMsg("");
    const { error } = await supabase
      .from("todos")
      .update({ done: !t.done })
      .eq("id", t.id);

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

  // Milestones based on togetherDate
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

    const addDays = (n: number) =>
      new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
    const addMonths = (n: number) =>
      new Date(base.getFullYear(), base.getMonth() + n, base.getDate());
    const addYears = (n: number) =>
      new Date(base.getFullYear() + n, base.getMonth(), base.getDate());

    return [
      mk("100 days", addDays(100)),
      mk("6 months", addMonths(6)),
      mk("1 year", addYears(1)),
    ];
  }, [togetherDate, today]);

  return (
    <main className={`${bodyFont.className} min-h-screen text-[#F8EDEB]`}>
      {/* Background */}
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

{/* Dark overlay (makes print darker + readable) */}
<div className="fixed inset-0 bg-black/40" />



      <div className="relative px-6 py-10">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`${fancy.className} text-6xl leading-none`}>
                Red Thread
              </h1>
              <p className="mt-4 max-w-2xl opacity-85 leading-relaxed">
                We tried apps for couples and we always stopped using them. So I
                decided to make this for us - a space we can build together. And
                also because you love keeping things organized.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-sm border border-[#F8EDEB]/35 px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
            >
              Back
            </Link>
          </div>

          {/* Dashboard row */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* LEFT: calendar + counters */}
            <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
              <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                Today
              </div>
              <div className="mt-2 text-lg">{formatDateLong(today)}</div>

              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs opacity-90">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div
                    key={i}
                    className="opacity-60 text-[10px] tracking-[0.2em]"
                  >
                    {d}
                  </div>
                ))}

                {monthCells.map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-md py-1.5 border border-[#F8EDEB]/10 ${
                      c.isToday
                        ? "bg-[#F8EDEB] text-[#4E0707] border-[#F8EDEB]"
                        : "bg-black/10"
                    }`}
                  >
                    {c.day ?? ""}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[10px] uppercase tracking-[0.25em] opacity-65">
                {monthLabel}
              </div>

              <div className="mt-5 grid gap-3 border-t border-[#F8EDEB]/12 pt-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                    Days since we met
                  </div>
                  <div className="mt-1 text-3xl font-semibold">{daysSinceMet}</div>
                  <div className="text-xs opacity-70">Since Oct 5, 2025</div>
                </div>

                <div className="border-t border-[#F8EDEB]/12 pt-3">
                  <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                    Days together
                  </div>
                  <div className="mt-1 text-3xl font-semibold">{daysTogether}</div>
                  <div className="text-xs opacity-70">Since Nov 20, 2025</div>
                </div>
              </div>
            </section>

            {/* RIGHT: spotify + pinned notes */}
            <section className="rounded-xl border border-[#F8EDEB]/18 bg-black/20 backdrop-blur-sm p-5">
              <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                Quick
              </div>

              <a
                href={spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-sm border border-[#F8EDEB]/35 px-4 py-3 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
              >
                Open our Spotify playlist
              </a>

              <div className="mt-6 text-xs uppercase tracking-[0.25em] opacity-75">
                Pinned Notes
              </div>

              <form onSubmit={savePinned} className="mt-4 grid gap-5">
                <div>
                  <div className="text-sm mb-2 opacity-80">Keya</div>
                  <textarea
                    value={keyaNote}
                    onChange={(e) => setKeyaNote(e.target.value)}
                    placeholder="Keya's pinned note…"
                    rows={4}
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />
                </div>

                <div>
                  <div className="text-sm mb-2 opacity-80">Tai</div>
                  <textarea
                    value={taiNote}
                    onChange={(e) => setTaiNote(e.target.value)}
                    placeholder="Tai's pinned note…"
                    rows={4}
                    className="w-full rounded-md border border-[#F8EDEB]/20 bg-transparent px-4 py-3 outline-none placeholder:opacity-60 focus:border-[#F8EDEB]/45"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="rounded-sm border border-[#F8EDEB]/35 px-5 py-2 text-xs uppercase tracking-[0.25em] hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
                  >
                    Save Notes
                  </button>

                  {pinSaved && <span className="text-sm opacity-80">{pinSaved}</span>}
                </div>
              </form>
            </section>
          </div>

          {/* Tabs */}
          <div className="mt-10 flex flex-wrap gap-2">
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
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                  Add a memory
                </div>

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
                      <span className="text-xs opacity-70">
                        {file ? file.name : "optional"}
                      </span>
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
                      <img
                        src={previewUrl}
                        alt=""
                        className="w-full max-h-[420px] object-cover"
                      />
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

                      {p.body && (
                        <p className="mt-4 whitespace-pre-wrap leading-relaxed">
                          {p.body}
                        </p>
                      )}
                    </div>

                    {p.image_url && (
                      <div className="border-t border-[#F8EDEB]/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-full max-h-[520px] object-cover"
                        />
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
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                  Add a love note
                </div>

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

                    {n.body && (
                      <p className="mt-4 whitespace-pre-wrap leading-relaxed">
                        {n.body}
                      </p>
                    )}
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
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                  Add an item
                </div>

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
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                  Checklist
                </div>

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
                        <span className={t.done ? "line-through opacity-60" : ""}>
                          {t.text}
                        </span>
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
                <div className="text-xs uppercase tracking-[0.25em] opacity-75">
                  Milestones
                </div>

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
