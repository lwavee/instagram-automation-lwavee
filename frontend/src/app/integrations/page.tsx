"use client";

import React, { useState, useEffect } from "react";
import {
  Plug,
  Sparkles,
  Instagram,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  Play,
  RotateCw,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default function IntegrationsPage() {
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [igAccount, setIgAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"ai" | "instagram" | "storage">("instagram");
  const [showManualForm, setShowManualForm] = useState(false);

  // AI Configuration inputs
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "openrouter">("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");

  // Instagram Manual Token input (fallback)
  const [igId, setIgId] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [igToken, setIgToken] = useState("");

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const [aiRes, igRes] = await Promise.all([
        api.getAiProviders().catch(() => ({ providers: [] })),
        api.getInstagramAccount().catch(() => ({ isConnected: false })),
      ]);

      if (aiRes?.providers) {
        setAiProviders(aiRes.providers);
      }

      if (igRes?.isConnected && igRes?.account) {
        setIgAccount(igRes.account);
      } else {
        setIgAccount(null);
      }
    } catch (err: any) {
      console.warn("Could not load integrations:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();

    // Check query params for OAuth redirect results
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const connected = searchParams.get("connected");
      const username = searchParams.get("username");
      const error = searchParams.get("error");

      if (connected === "true") {
        setActiveTab("instagram");
        setStatusMsg(
          username
            ? `🎉 Success! Instagram account @${username} connected successfully via official Meta OAuth.`
            : "🎉 Success! Instagram account connected successfully via Meta OAuth."
        );
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        setActiveTab("instagram");
        setStatusMsg(`❌ Meta Authorization Error: ${decodeURIComponent(error)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setStatusMsg("Redirecting to official Meta Facebook Login for Business...");
      const res = await api.getInstagramAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Server did not return a valid Meta OAuth URL.");
      }
    } catch (err: any) {
      setStatusMsg(`OAuth Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect this Instagram account? Automatic publishing and analytics sync will be stopped."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await api.disconnectInstagram();
      setIgAccount(null);
      setStatusMsg("Instagram account disconnected successfully.");
      await loadIntegrations();
    } catch (err: any) {
      setStatusMsg(`Disconnect error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAi = async () => {
    if (!apiKeyInput) {
      setStatusMsg("Please enter an API key to test.");
      return;
    }
    try {
      setLoading(true);
      setStatusMsg("Testing provider connection...");
      const res = await api.testAiConnection({
        provider: selectedProvider,
        apiKey: apiKeyInput,
        model: selectedModel,
      });

      if (res?.success) {
        setStatusMsg(`Success: ${res.data.message}`);
      } else {
        setStatusMsg(`Failed: ${res.data.message}`);
      }
    } catch (err: any) {
      setStatusMsg(`Connection test error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput) return;

    try {
      setLoading(true);
      setStatusMsg("Encrypting and saving API key with AES-256-GCM...");
      await api.saveAiConfig({
        provider: selectedProvider,
        apiKey: apiKeyInput,
        defaultModel: selectedModel,
        isEnabled: true,
      });
      setStatusMsg("AI provider configured and encrypted successfully!");
      setApiKeyInput("");
      loadIntegrations();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectInstagramManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!igId || !igUsername || !igToken) {
      setStatusMsg("Please enter Instagram ID, username, and token.");
      return;
    }

    try {
      setLoading(true);
      await api.connectInstagramToken({
        instagramId: igId,
        username: igUsername,
        accessToken: igToken,
      });
      setStatusMsg("Instagram account connected and encrypted successfully!");
      setIgToken("");
      loadIntegrations();
    } catch (err: any) {
      setStatusMsg(`Instagram connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Plug className="w-8 h-8 text-brand-400" />
            API Integrations & Credentials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official Meta OAuth flow & AI providers. Sensitive tokens are encrypted with AES-256-GCM and never exposed to the frontend.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 text-xs rounded-lg border flex items-center justify-between ${
            statusMsg.includes("Error") || statusMsg.includes("Failed") || statusMsg.includes("❌")
              ? "bg-destructive/15 border-destructive/30 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("instagram")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === "instagram"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Instagram className="w-4 h-4" /> Instagram Graph API
          {igAccount && <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />}
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === "ai"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Providers
        </button>

        <button
          onClick={() => setActiveTab("storage")}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
            activeTab === "storage"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Cloud className="w-4 h-4" /> Media Storage
        </button>
      </div>

      {/* TAB 1: Instagram Graph API */}
      {activeTab === "instagram" && (
        <div className="space-y-6">
          {igAccount ? (
            /* Connected Instagram Account Card */
            <Card className="border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-card/80 to-card">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div className="flex items-center gap-4">
                  {igAccount.profilePictureUrl ? (
                    <img
                      src={igAccount.profilePictureUrl}
                      alt={igAccount.username}
                      className="w-14 h-14 rounded-full border-2 border-pink-500/40 object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                      <Instagram className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-foreground">
                        {igAccount.name || igAccount.username}
                      </h3>
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Connected & Verified
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {igAccount.accountType || "BUSINESS"}
                      </Badge>
                    </div>
                    <p className="text-sm text-pink-400 font-medium">@{igAccount.username}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Instagram Business Account ID: <span className="font-mono">{igAccount.instagramId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOAuthConnect}
                    isLoading={loading}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Reconnect / Refresh Token
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectInstagram}
                    isLoading={loading}
                    className="gap-1.5 text-xs text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                  >
                    <X className="w-3.5 h-3.5" /> Disconnect
                  </Button>
                </div>
              </CardHeader>

              {/* Account Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl border border-border/80 bg-secondary/30">
                  <span className="text-xs text-muted-foreground block">Followers</span>
                  <span className="text-xl font-bold text-foreground">
                    {igAccount.followersCount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-border/80 bg-secondary/30">
                  <span className="text-xs text-muted-foreground block">Following</span>
                  <span className="text-xl font-bold text-foreground">
                    {igAccount.followsCount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-border/80 bg-secondary/30">
                  <span className="text-xs text-muted-foreground block">Reels & Media</span>
                  <span className="text-xl font-bold text-foreground">
                    {igAccount.mediaCount?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>

              {/* Security & Token Health Details */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 space-y-3 mt-4 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>OAuth Security: AES-256-GCM Encrypted Long-Lived Token (60 Days)</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Last Synced: {igAccount.lastSyncedAt ? formatDate(igAccount.lastSyncedAt) : "Just now"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground text-[11px] border-t border-border/60 pt-2">
                  <span>Token Expiration:</span>
                  <span className="font-medium text-foreground">
                    {igAccount.tokenExpiresAt ? formatDate(igAccount.tokenExpiresAt) : "Auto-managed by Meta OAuth"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Meta Permissions Granted:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(igAccount.permissions?.length
                      ? igAccount.permissions
                      : [
                          "instagram_basic",
                          "instagram_content_publish",
                          "instagram_manage_insights",
                          "pages_show_list",
                          "pages_read_engagement",
                        ]
                    ).map((perm: string) => (
                      <Badge key={perm} variant="outline" className="font-mono text-[10px] bg-secondary/60">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            /* Disconnected / Not-Connected OAuth Banner */
            <Card className="border-brand-500/30 bg-gradient-to-b from-brand-500/5 via-card/90 to-card space-y-6 p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl text-center md:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-pink-500/20 mx-auto md:mx-0">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Connect Instagram via Official Meta OAuth
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect in one click using Meta Facebook Login for Business. Authorize your Instagram Business or Creator account to enable automated Reel publishing, scheduled calendar publishing, and real-time insights.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center md:justify-start">
                    <Badge variant="outline" className="text-[10px]">Official Graph API v21.0</Badge>
                    <Badge variant="outline" className="text-[10px]">Zero Manual Tokens Required</Badge>
                    <Badge variant="outline" className="text-[10px]">AES-256-GCM Encrypted</Badge>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-3">
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={handleOAuthConnect}
                    isLoading={loading}
                    className="gap-2.5 px-8 py-3 text-sm font-semibold shadow-xl shadow-pink-500/25 transition-all hover:scale-[1.02]"
                  >
                    <Instagram className="w-5 h-5" /> Connect Instagram
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Redirects to secure Meta authorization
                  </span>
                </div>
              </div>

              {/* Requirements & Permissions Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-2 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-400" />
                    Account Eligibility Requirements:
                  </h4>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Instagram account must be converted to <strong>Professional</strong> (Business or Creator).</li>
                    <li>The Instagram profile must be linked to a <strong>Facebook Page</strong> in Meta Business Suite.</li>
                    <li>You must log in with the Facebook account that owns or manages that Facebook Page.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-2 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Permissions Requested:
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      "instagram_basic",
                      "instagram_content_publish",
                      "instagram_manage_insights",
                      "pages_show_list",
                      "pages_read_engagement",
                    ].map((perm) => (
                      <Badge key={perm} variant="outline" className="font-mono text-[10px]">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Used strictly for media publishing & insights. No private DMs or passwords accessed.
                  </p>
                </div>
              </div>

              {/* Developer Collapsible Manual Entry (Hidden from normal UI) */}
              <div className="pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  <span>{showManualForm ? "Hide Advanced Manual Token Entry" : "Advanced: Manual Token Entry (Developer / Fallback Only)"}</span>
                  {showManualForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showManualForm && (
                  <form onSubmit={handleConnectInstagramManual} className="space-y-3 mt-4 max-w-lg p-4 rounded-xl bg-secondary/20 border border-border/60">
                    <p className="text-[11px] text-amber-400">
                      ⚠️ Note: For normal use, click &quot;Connect Instagram&quot; above instead. This manual form is only for System User Access Tokens from Meta Business Suite.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Instagram Business Account ID:
                      </label>
                      <input
                        type="text"
                        required
                        value={igId}
                        onChange={(e) => setIgId(e.target.value)}
                        placeholder="e.g. 17841405309211844"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Username (@handle):
                      </label>
                      <input
                        type="text"
                        required
                        value={igUsername}
                        onChange={(e) => setIgUsername(e.target.value)}
                        placeholder="e.g. learnwithavee"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Access Token (SUAT):
                      </label>
                      <input
                        type="password"
                        required
                        value={igToken}
                        onChange={(e) => setIgToken(e.target.value)}
                        placeholder="EAA..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground font-mono"
                      />
                    </div>

                    <Button variant="outline" size="sm" type="submit" isLoading={loading} className="gap-2 text-xs">
                      <Save className="w-3.5 h-3.5" /> Save Manual Token
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: AI Providers */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiProviders.map((p) => (
              <Card
                key={p.provider}
                className={`cursor-pointer transition-all ${
                  selectedProvider === p.provider ? "border-brand-500 ring-1 ring-brand-500" : ""
                }`}
                onClick={() => {
                  setSelectedProvider(p.provider);
                  setSelectedModel(p.defaultModel);
                }}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <Badge variant={p.isConfigured ? "success" : "secondary"}>
                    {p.isConfigured ? "Configured" : "Not Set"}
                  </Badge>
                  {p.isTestedSuccessfully && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-foreground capitalize mb-1">{p.provider}</h3>
                <p className="text-[11px] text-muted-foreground mb-3">Model: {p.defaultModel}</p>
                <span className="font-mono text-[10px] text-muted-foreground block truncate">
                  Key: {p.maskedKey || "None"}
                </span>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configure {selectedProvider.toUpperCase()}</CardTitle>
              <CardDescription>
                Keys are encrypted server-side using AES-256-GCM before saving to MongoDB
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveAi} className="space-y-4 pt-2 max-w-xl">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  API Key:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter raw API key (sk-...)"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 pl-8 font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Default Model:
                </label>
                <input
                  type="text"
                  required
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleTestAi}
                  isLoading={loading}
                  className="gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Test Connection
                </Button>
                <Button variant="gradient" size="sm" type="submit" isLoading={loading} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save & Encrypt
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 3: Media Storage */}
      {activeTab === "storage" && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>External Persistent Storage</CardTitle>
            <CardDescription>
              Cloudinary provides persistent public HTTPS URLs required by Meta Graph API container video publishing.
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="success">Active</Badge>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Cloudinary Media Storage</h4>
              <p className="text-xs text-muted-foreground">Configured in environment with cloud `jt4ujzfr`</p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
              <Badge variant="outline">Fallback</Badge>
              <h4 className="text-sm font-bold text-foreground">Local Storage</h4>
              <p className="text-xs text-muted-foreground">Local disk storage for development offline</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
