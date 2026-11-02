"use client";

import React, { useState, useEffect } from "react";
import { Bell, Instagram, ShieldCheck, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { api } from "@/lib/api";
import Link from "next/link";

export function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState("");

  useEffect(() => {
    async function loadStatus() {
      try {
        const notifs = await api.getNotifications();
        setUnreadCount(notifs?.unreadCount || 0);

        const account = await api.getInstagramAccount();
        if (account?.isConnected && account?.account) {
          setIgConnected(true);
          setIgUsername(account.account.username);
        }
      } catch (e) {
        // Silently continue if backend is starting
      }
    }
    loadStatus();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Brand & Focus badge */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Instagram Engine Active
        </span>
        <span className="text-muted-foreground/40 font-light">|</span>
        <span className="text-xs text-brand-300 font-medium">
          Focus: AI • Tech • Hindi/Hinglish Reels
        </span>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-4">
        {/* Instagram Account Connection Pill */}
        {igConnected ? (
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
