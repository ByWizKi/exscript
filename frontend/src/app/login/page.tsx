"use client";

import { useState, useCallback, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("exscript-theme");
    if (saved) {
      setIsDark(saved === "dark");
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("exscript-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }, []);

  const t = isDark ? "dark" : "light";

  return (
    <div data-t={t} className="l-root min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
        className="l-toggle fixed top-4 right-5 z-50 w-9 h-9 flex items-center justify-center"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <main className="l-card relative z-10 w-full max-w-[410px] mx-4 rounded-[28px] px-5 sm:px-9 py-8 sm:py-11 text-center animate-fade-in">
        <div className="mb-9">
          <h1 className="font-heading font-black leading-none tracking-tighter mb-2.5 text-4xl sm:text-5xl">
            <span className="brand-ex">Ex</span>
            <span className="brand-ref">Script</span>
          </h1>
          <p className="brand-sub text-sm tracking-wide">
            Configurateur Google Apps Script
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="btn-google w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" aria-hidden />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continuer avec Google
        </button>

        <p className="brand-sub text-xs mt-6">
          Réservé aux collaborateurs{" "}
          <span style={{ color: "rgb(255 213 0)" }}>@extia-inge.fr</span>
        </p>
      </main>

      <footer className="l-footer relative z-10 mt-6 text-[10px] tracking-[0.3em] uppercase">
        Extia Ingénierie
      </footer>
    </div>
  );
}
