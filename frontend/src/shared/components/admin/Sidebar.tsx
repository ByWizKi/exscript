"use client";

import { ChevronsLeft, ChevronsRight, LogOut, Sun, Moon } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { NavItem } from "./NavItem";

interface SidebarProps {
  name: string;
  email: string;
  navItems: Array<{ href: string; label: string; icon: LucideIcon }>;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  name,
  email,
  navItems,
  pathname,
  collapsed,
  onToggle,
  onLogout,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const initial = name?.charAt(0).toUpperCase() || "U";

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("exscript-theme");
    const dark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("exscript-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-50" : "hidden md:flex"
        } flex-col bg-extia-night h-screen transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Top — Logo + collapse */}
        <div className={`border-b border-white/10 px-3 py-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/" className="font-heading font-extrabold text-lg leading-none">
              <span className="text-extia-yellow">Ex</span><span className="text-white">Script</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-extia-yellow/20 hover:text-extia-yellow transition-colors border border-white/10"
            title={collapsed ? "Agrandir" : "Réduire"}
            aria-label={collapsed ? "Agrandir la barre de navigation" : "Réduire la barre de navigation"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <div className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href || pathname.startsWith(href + "/")}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* Bottom — user + theme + logout */}
        <div className="border-t border-white/10 px-2 py-3 space-y-3">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-full bg-white/20 text-white font-medium text-sm flex items-center justify-center flex-shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{name}</p>
                <p className="text-white/50 text-xs truncate">{email}</p>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          {collapsed ? (
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Thème clair" : "Thème sombre"}
              aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
              className="w-full p-2 text-white/60 hover:text-extia-yellow hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
              className="w-full px-3 py-2 text-white/70 hover:text-extia-yellow hover:bg-white/5 rounded-lg transition-colors text-sm font-medium text-left flex items-center gap-2"
            >
              {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {isDark ? "Thème clair" : "Thème sombre"}
            </button>
          )}

          {/* Logout */}
          {collapsed ? (
            <button
              type="button"
              onClick={onLogout}
              className="w-full p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium text-left flex items-center gap-2"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Se déconnecter
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
