"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface Props {
  name: string;
  email: string;
  picture?: string | null;
}

export default function HomeClient({ name, email, picture }: Props) {
  const [isDark, setIsDark] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("exscript-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("exscript-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }, []);

  const t = isDark ? "dark" : "light";

  return (
    <div data-t={t} className="l-root min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Controls */}
      <div className="fixed top-4 right-5 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
          className="l-toggle w-9 h-9 flex items-center justify-center"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Se déconnecter"
          className="l-toggle w-9 h-9 flex items-center justify-center disabled:opacity-50"
        >
          {loggingOut
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <LogOut size={16} />
          }
        </button>
      </div>

      {/* Card */}
      <main className="l-card relative z-10 w-full max-w-[410px] mx-4 rounded-[28px] px-5 sm:px-9 py-8 sm:py-11 text-center animate-fade-in">
        {/* Avatar */}
        {picture && (
          <img
            src={picture}
            alt={name}
            className="w-16 h-16 rounded-full mx-auto mb-5 ring-2"
            style={{ ringColor: "rgba(255,213,0,0.4)" }}
          />
        )}

        {/* Brand */}
        <h1 className="font-heading font-black leading-none tracking-tighter mb-1 text-4xl sm:text-5xl">
          <span className="brand-ex">Ex</span>
          <span className="brand-ref">Script</span>
        </h1>
        <p className="brand-sub text-sm tracking-wide mb-8">
          Configurateur Google Apps Script
        </p>

        {/* User info */}
        <div className="mb-8">
          <p className={`font-semibold text-base mb-1 ${isDark ? "text-white" : "text-extia-night"}`}>
            Bienvenue, {name} 👋
          </p>
          <p className="brand-sub text-xs">{email}</p>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-yellow w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loggingOut && (
            <span className="w-4 h-4 border-2 border-extia-night border-t-transparent rounded-full animate-spin" />
          )}
          <LogOut size={15} />
          Se déconnecter
        </button>
      </main>

      <footer className="l-footer relative z-10 mt-6 text-[10px] tracking-[0.3em] uppercase">
        Extia Ingénierie
      </footer>
    </div>
  );
}
