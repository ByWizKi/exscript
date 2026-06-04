"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { AlertTriangle, X } from "lucide-react";

export function SessionExpiredBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-amber-500 text-white text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>Votre session a expiré.</span>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="underline underline-offset-2 hover:no-underline font-semibold"
        >
          Se reconnecter
        </button>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fermer"
        className="p-1 rounded hover:bg-amber-600 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
