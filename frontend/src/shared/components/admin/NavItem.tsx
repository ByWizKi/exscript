"use client";

import { memo } from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  collapsed: boolean;
}

export const NavItem = memo(
  ({ href, label, icon: Icon, isActive, collapsed }: NavItemProps) => {
    const baseClasses =
      "flex items-center gap-3 transition-colors no-underline font-medium text-sm";

    const activeClasses = isActive
      ? collapsed
        ? "bg-extia-yellow/10 text-white rounded-lg"
        : "border-l-[3px] border-extia-yellow bg-extia-yellow/10 text-white"
      : "text-white/70 hover:text-white hover:bg-white/5";

    const paddingClasses = collapsed
      ? "w-10 h-10 justify-center rounded-lg mx-auto"
      : "px-4 py-2.5";

    return (
      <Link
        href={href}
        className={`${baseClasses} ${activeClasses} ${paddingClasses}`}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  }
);

NavItem.displayName = "NavItem";
