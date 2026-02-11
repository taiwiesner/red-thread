"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Post = {
  id: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

export default function Inside() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      return;
    }
    setPosts((data as Post[]) ?? []);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function addPost(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    let image_url: string | null = null;

    // Upload photo (optional)
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file);

      if (upErr) {
        setMsg(upErr.message);
        return;
      }

      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      image_url = data.publicUrl;
    }

    // Insert post
    const { error } = await supabase.from("posts").insert({
      title: title || null,
      body: body || null,
      image_url,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setTitle("");
    setBody("");
    setFile(null);
    setMsg("Saved.");
    await loadPosts();
  }

  function getStoragePathFromPublicUrl(url: string) {
    // public URL looks like:
    // https://<project>.supabase.co/storage/v1/object/public/photos/uploads/<file>
    const marker = "/storage/v1/object/public/photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length); // returns "uploads/<file>"
  }

  async function deletePost(p: Post) {
    setMsg("");
    setBusyId(p.id);

    // 1) delete DB row
    const { error } = await supabase.from("posts").delete().eq("id", p.id);

    if (error) {
      setBusyId(null);
      setMsg(error.message);
      return;
    }

    // 2) best-effort delete photo file (optional)
    if (p.image_url) {
      const path = getStoragePathFromPublicUrl(p.image_url);
      if (path) {
        await supabase.storage.from("photos").remove([path]);
      }
    }

    setBusyId(null);
    setMsg("Deleted.");
    await loadPosts();
  }

  return (
    <main className="min-h-screen bg-[#4E0707] text-[#F8EDEB] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl tracking-wide">Inside</h1>

          <Link
            href="/"
            className="px-4 py-2 border border-[#F8EDEB] uppercase tracking-[0.25em] text-xs hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
          >
            Back
          </Link>
        </div>

        <form
          onSubmit={addPost}
          className="border border-[#F8EDEB]/40 p-4 mb-10"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full mb-3 px-3 py-2 bg-transparent border border-[#F8EDEB]/40 outline-none"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write something..."
            rows={5}
            className="w-full mb-3 px-3 py-2 bg-transparent border border-[#F8EDEB]/40 outline-none"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full mb-4"
          />

          <button
            type="submit"
            className="px-6 py-2 border border-[#F8EDEB] uppercase tracking-[0.25em] text-xs hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
          >
            Post
          </button>

          {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
        </form>

        <div className="grid gap-6">
          {posts.map((p) => (
            <article key={p.id} className="border border-[#F8EDEB]/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="opacity-90">
                  <div className="text-sm opacity-80">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                  <div className="text-lg mt-1">{p.title ?? "Untitled"}</div>
                </div>

                <button
                  onClick={() => deletePost(p)}
                  disabled={busyId === p.id}
                  className="text-xs uppercase tracking-[0.2em] border border-[#F8EDEB]/40 px-3 py-1 hover:bg-[#F8EDEB] hover:text-[#4E0707] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busyId === p.id ? "Deleting..." : "Delete"}
                </button>
              </div>

              {p.body && <p className="whitespace-pre-wrap mt-3">{p.body}</p>}

              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt=""
                  className="w-full rounded-sm border border-[#F8EDEB]/20 mt-4"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
