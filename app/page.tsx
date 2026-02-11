"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Parisienne } from "next/font/google";

const fancy = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
});

export default function Home() {
  const router = useRouter();

  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const correctPassword = "incandescent";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setShowUnlock(true);
        setError("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === correctPassword) {
      router.push("/inside");
    } else {
      setError("Wrong password.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#4E0707] px-6 text-[#F8EDEB]">
      <h1 className={`${fancy.className} text-8xl leading-none select-none`}>
        Red Thread
      </h1>

      {!showUnlock ? (
        <p className="mt-10 text-sm tracking-[0.25em] uppercase opacity-70 select-none">
          Press space
        </p>
      ) : (
        <form onSubmit={submit} className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm tracking-[0.25em] uppercase opacity-80">
            Enter password
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-64 px-4 py-2 bg-transparent border border-[#F8EDEB] text-[#F8EDEB] outline-none"
            autoFocus
          />

          <button
            type="submit"
            className="px-6 py-2 border border-[#F8EDEB] uppercase tracking-[0.25em] text-xs hover:bg-[#F8EDEB] hover:text-[#4E0707] transition"
          >
            Enter
          </button>

          {error && <p className="text-sm opacity-80">{error}</p>}
        </form>
      )}
    </main>
  );
}
