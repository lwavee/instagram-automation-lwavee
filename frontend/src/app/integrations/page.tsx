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
  const [connectionHealth, setConnectionHealth] = useState("disconnected");

  // AI Configuration inputs
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "openrouter">("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");

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

      setConnectionHealth(igRes?.health || "disconnected");
      if (igRes?.account) {
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
      const error = searchParams.get("error");

      if (connected === "true") {
        setActiveTab("instagram");
        setStatusMsg("Instagram and Facebook Page connected.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        setActiveTab("instagram");
        setStatusMsg(`❌ Meta Authorization Error: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      setStatusMsg("Opening Meta authorization...");
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
        "Disconnect the Instagram account and Facebook Page from this dashboard?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const result = await api.disconnectInstagram();
      setStatusMsg(result.message);
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

  const checkMetaHealth = async () => {
    setLoading(true);
    try {
      const result = await api.checkMetaHealth();
      setConnectionHealth(result.health);
      setIgAccount(result.account);
      setStatusMsg("Meta confirmed the current grant and Page access.");
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Meta authorization check failed.");
      await loadIntegrations();
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
            statusMsg.includes("Error") || statusMsg.includes("Failed") || statusMsg.includes("❌") || statusMsg.includes("Authentication required")
              ? "bg-destructive/15 border-destructive/30 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{statusMsg}</span>
            {statusMsg.includes("Authentication required") && (
              <a
                href="/login?redirect=/integrations"
                className="underline font-bold text-amber-300 hover:text-amber-200 ml-2"
              >
                Sign In Now →
              </a>
            )}
          </div>
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
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Instagram and Facebook Page</h2>
            <p className="text-sm text-muted-foreground">Authorize the configured Page and its linked Instagram professional account in Meta.</p>
          </div>
          <Badge variant={connectionHealth === "authorized" ? "success" : "warning"}>
            {connectionHealth === "authorized" ? "Authorized" : connectionHealth === "reconnect_required" ? "Reconnect required" : "Disconnected"}
          </Badge>
          {igAccount && (
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              <dt>Instagram</dt><dd>@{igAccount.username}</dd>
              {igAccount.page && <><dt>Facebook Page</dt><dd>{igAccount.page.name || igAccount.page.id} · {igAccount.page.canPublish ? "Publishing authorized" : "Publishing unavailable"}</dd></>}
              <dt>Followers</dt><dd>{igAccount.followersCount}</dd>
              <dt>Grant expires</dt><dd>{formatDate(igAccount.tokenExpiresAt)}</dd>
              <dt>Last checked</dt><dd>{formatDate(igAccount.lastSyncedAt)}</dd>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={handleOAuthConnect} isLoading={loading}>
              {igAccount ? "Reconnect with Meta" : "Connect with Meta"}
            </Button>
            {igAccount && connectionHealth !== "disconnected" && (
              <>
                <Button variant="outline" onClick={checkMetaHealth} disabled={loading}>Check authorization</Button>
                <Button variant="outline" onClick={handleDisconnectInstagram} disabled={loading}>Disconnect</Button>
              </>
            )}
          </div>
        </Card>
      )}

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
