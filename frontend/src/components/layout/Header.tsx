"use client";

import React, { useState, useEffect } from "react";
import { Bell, Instagram, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { api } from "@/lib/api";
import Link from "next/link";

export function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [igStatus, setIgStatus] = useState<"checking" | "connected" | "not-connected" | "unavailable">("checking");
  const [igUsername, setIgUsername] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      const [notifications, instagram] = await Promise.allSettled([
        api.getNotifications(),
        api.getInstagramAccount(),
      ]);
      if (!active) return;

      if (notifications.status === "fulfilled") {
        setUnreadCount(notifications.value?.unreadCount || 0);
      }

      if (instagram.status === "rejected") {
        setIgStatus("unavailable");
      } else if (instagram.value?.isConnected && instagram.value?.account) {
        setIgUsername(instagram.value.account.username);
        setIgStatus("connected");
      } else {
        setIgStatus("not-connected");
      }
    }
    void loadStatus();
    return () => { active = false; };
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Brand & Focus badge */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${igStatus === "connected" ? "bg-emerald-400" : igStatus === "checking" ? "bg-slate-400 animate-pulse" : "bg-amber-400"}`} />
          {igStatus === "checking" ? "Checking Instagram" :
            igStatus === "connected" ? "Instagram Connected" :
              igStatus === "not-connected" ? "Instagram Not Connected" : "Instagram Status Unavailable"}
        </span>
        <span className="text-muted-foreground/40 font-light">|</span>
        <span className="text-xs text-brand-300 font-medium">
          {igStatus === "connected" && igUsername ? `@${igUsername} • Instagram AI Automation` : "Learn with Avee • Content Automation"}
        </span>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-4">
        {/* Instagram Account Connection Pill */}
        {igStatus === "connected" ? (
          <Link
            href="/publishing"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium hover:bg-pink-500/15 transition-all"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>@{igUsername}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
          </Link>
        ) : (
          <Link
            href="/integrations"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium hover:bg-amber-500/15 transition-all"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Connect Instagram</span>
          </Link>
        )}

        {/* Notifications Icon Link */}
        <Link
          href="/settings"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-background" />
          )}
        </Link>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-xs uppercase">
            {user?.name ? user.name[0] : "A"}
          </div>
          <span className="text-xs font-medium text-foreground hidden sm:inline-block">
            {user?.name || "Avee"}
          </span>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors ml-1"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

