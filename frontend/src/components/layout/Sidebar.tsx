"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  CalendarDays,
  FolderOpen,
  Send,
  BarChart3,
  Settings,
  Plug,
  Instagram,
  Clock,
  ListOrdered,
  FileCode,
  Activity,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";

// The 13 required dashboard navigation modules for LWAVEE
const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Content Studio", href: "/content-studio", icon: Sparkles },
  { name: "AI Caption Generator", href: "/ai-caption-generator", icon: Bot },
  { name: "Media Library", href: "/media", icon: FolderOpen },
  { name: "Content Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Scheduled Posts", href: "/scheduled-posts", icon: Clock },
  { name: "Publishing Queue", href: "/publishing-queue", icon: ListOrdered },
  { name: "Instagram Accounts", href: "/instagram-accounts", icon: Instagram },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Automation Logs", href: "/automation-logs", icon: Activity },
  { name: "AI Settings", href: "/ai-settings", icon: FileCode },
  { name: "API Integrations", href: "/integrations", icon: Plug },
  { name: "Account Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const autoPublish = user?.preferences?.autoPublishEnabled || false;

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold text-lg">
          L
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-foreground block leading-none">
            LWAVEE
          </span>
          <span className="text-[10px] font-semibold text-brand-400 block tracking-wider uppercase mt-1">
            Instagram AI Automation
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-brand-500/15 text-brand-300 font-semibold shadow-sm border border-brand-500/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-brand-400" : "text-muted-foreground")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Auto-Publish Guardrail Notice in Footer */}
      <div className="p-4 border-t border-border/80 bg-secondary/30">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground font-medium text-[11px]">Publishing Gate:</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wide",
              autoPublish
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            )}
          >
            {autoPublish ? "Auto-Approved" : "Manual Approval"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Target Account: <strong className="text-foreground">@lw_avee</strong>. Content is never published without explicit approval.
        </p>
      </div>
    </aside>
  );
}
