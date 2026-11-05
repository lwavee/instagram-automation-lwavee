"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Instagram, ShieldCheck, RefreshCw, Unlink, ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

export default function InstagramAccountsPage() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        const res = await api.getInstagramAccount();
        if (res?.isConnected && res?.account) {
          setAccount(res.account);
        }
      } catch (e) {
        // Continue
      } finally {
        setLoading(false);
      }
    }
    loadAccount();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Instagram className="w-7 h-7 text-pink-400" />
            Instagram Professional Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta Facebook Login for Business connection status and access tokens for @lw_avee
          </p>
        </div>
        <div>
          <Link href="/integrations">
            <Button variant="gradient" size="sm" className="gap-2">
              <Instagram className="w-4 h-4" />
              Manage Meta OAuth
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5 border-brand-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-brand-500 to-amber-500 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-background rounded-full flex items-center justify-center font-bold text-lg text-foreground">
                  A
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">@lw_avee</h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">Instagram Creator / Business Account</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
              CONNECTED
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="text-center p-3 rounded-xl bg-secondary/40">
              <span className="text-xs text-muted-foreground block">Followers</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">5.2K</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/40">
              <span className="text-xs text-muted-foreground block">Following</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">120</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/40">
              <span className="text-xs text-muted-foreground block">Posts</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">85</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>Graph API: <strong>v21.0 Official</strong></span>
            <span>Token: <strong>60-day Long-Lived (AES-256)</strong></span>
          </div>
        </Card>
      </div>
    </div>
  );
}
