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
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function IntegrationsPage() {
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"ai" | "instagram" | "storage">("ai");

  // AI Configuration inputs
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "openrouter">("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  // Instagram Manual Token input
  const [igId, setIgId] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [igToken, setIgToken] = useState("");

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const res = await api.getAiProviders();
      if (res?.providers) {
        setAiProviders(res.providers);
      }
    } catch (err: any) {
      console.warn("Could not load integrations:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

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

  const handleConnectInstagram = async (e: React.FormEvent) => {
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
            Secure server-side storage with AES-256-GCM encryption. API keys are never exposed in frontend code.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "ai"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Providers
        </button>

        <button
          onClick={() => setActiveTab("instagram")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "instagram"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Instagram className="w-4 h-4" /> Meta / Instagram Graph API
        </button>

        <button
          onClick={() => setActiveTab("storage")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "storage"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Cloud className="w-4 h-4" /> Media Storage
        </button>
      </div>

      {/* TAB 1: AI Providers */}
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

      {/* TAB 2: Instagram Graph API */}
      {activeTab === "instagram" && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>Official Meta Instagram Graph API Setup</CardTitle>
            <CardDescription>
              Connect an Instagram Business or Creator account for official Reels publishing
            </CardDescription>
          </CardHeader>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <h4 className="font-bold text-foreground">Required Meta Permissions:</h4>
            <div className="flex flex-wrap gap-2 pt-1">
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
            <p className="pt-2 text-[11px]">
              Note: The Instagram account must be linked to a Facebook Page within Meta Business Suite.
            </p>
          </div>

          <form onSubmit={handleConnectInstagram} className="space-y-4 max-w-xl">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Manual Credential Entry / Production Token:
            </h4>

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
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
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
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Long-Lived Access Token:
              </label>
              <input
                type="password"
                required
                value={igToken}
                onChange={(e) => setIgToken(e.target.value)}
                placeholder="EAA..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>

            <Button variant="gradient" size="sm" type="submit" isLoading={loading} className="gap-2">
              <Instagram className="w-4 h-4" /> Save & Verify Instagram Account
            </Button>
          </form>
        </Card>
      )}

      {/* TAB 3: Media Storage */}
      {activeTab === "storage" && (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>External Persistent Storage</CardTitle>
            <CardDescription>
              Render web services use an ephemeral filesystem. Media files require external storage.
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
              <Badge variant="outline">Local Disk</Badge>
              <h4 className="text-sm font-bold text-foreground">Local Storage</h4>
              <p className="text-xs text-muted-foreground">Default development fallback</p>
            </div>

            <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 space-y-1">
              <Badge variant="default">Recommended</Badge>
              <h4 className="text-sm font-bold text-foreground">Cloudinary</h4>
              <p className="text-xs text-muted-foreground">Auto video encoding & 9:16 cropping</p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
              <Badge variant="outline">Supabase</Badge>
              <h4 className="text-sm font-bold text-foreground">Supabase Storage</h4>
              <p className="text-xs text-muted-foreground">S3-compatible object storage</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

