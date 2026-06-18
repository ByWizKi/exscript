"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Code2, Menu } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Sidebar, SessionExpiredBanner } from "@/shared/components";

const BackgroundOrbs = memo(function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hidden dark:block absolute rounded-full"
        style={{ width: 480, height: 480, top: "10%", left: "20%", background: "rgba(255,213,0,0.12)", filter: "blur(60px)", animation: "orb-float 22s infinite alternate", willChange: "transform", transform: "translateZ(0)" }} />
      <div className="hidden dark:block absolute rounded-full"
        style={{ width: 400, height: 400, bottom: "10%", right: "15%", background: "rgba(0,60,180,0.18)", filter: "blur(55px)", animation: "orb-float 28s infinite alternate-reverse", willChange: "transform", transform: "translateZ(0)" }} />
      <div className="dark:hidden absolute rounded-full"
        style={{ width: 480, height: 480, top: "10%", left: "20%", background: "rgba(255,213,0,0.08)", filter: "blur(60px)", animation: "orb-float 22s infinite alternate", willChange: "transform", transform: "translateZ(0)" }} />
      <div className="dark:hidden absolute rounded-full"
        style={{ width: 400, height: 400, bottom: "10%", right: "15%", background: "rgba(0,60,180,0.07)", filter: "blur(55px)", animation: "orb-float 28s infinite alternate-reverse", willChange: "transform", transform: "translateZ(0)" }} />
    </div>
  );
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      window.dispatchEvent(new Event("session-expired"));
    }
  }, [session?.error]);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const navItems = useMemo(() => [
    { href: "/",        label: "Dashboard",  icon: LayoutDashboard },
    { href: "/scripts", label: "Scripts",    icon: Code2 },
  ], []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#edf0f9] dark:bg-extia-night">
        <span className="w-8 h-8 border-4 border-extia-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      className="fixed inset-0 flex z-50 app-bg"
    >
      <SessionExpiredBanner />
      <BackgroundOrbs />

      <Sidebar
        name={session.user?.name ?? ""}
        email={session.user?.email ?? ""}
        navItems={navItems}
        pathname={pathname}
        collapsed={collapsed}
        onToggle={handleToggleCollapsed}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white/80 dark:bg-extia-night/80 backdrop-blur border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="font-heading font-extrabold text-lg leading-none">
            <span className="text-extia-yellow">Ex</span>
            <span className="text-extia-night dark:text-white">Script</span>
          </Link>
        </div>

        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
