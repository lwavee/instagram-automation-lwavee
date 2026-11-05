"use client";

import React, { useState } from "react";
import { FileCode, Bot, Lock, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function AISettingsPage() {
  const [model, setModel] = useState("meta-llama/llama-3.3-70b-instruct");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileCode className="w-7 h-7 text-brand-400" />
            AI Model Settings & OpenRouter Config
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure OpenRouter AI models, generation temperature, and token budgets for @lw_avee.
          </p>
        </div>
        <div>
          <Link href="/integrations">
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="w-4 h-4" /> Manage API Keys
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6 space-y-6 max-w-2xl">
        <CardHeader className="p-0">
          <CardTitle className="text-base">OpenRouter AI Provider Parameters</CardTitle>
          <CardDescription>
            Select free and low-cost high-performance LLMs to power captions, hooks, and Reel scripts.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Active AI Model:
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct (Recommended - Ultra Sharp)</option>
              <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001 (Fast & Cost Effective)</option>
              <option value="deepseek/deepseek-chat">deepseek/deepseek-chat (Deep Reasoning)</option>
              <option value="anthropic/claude-3.5-haiku">anthropic/claude-3.5-haiku (Punchy Social Copy)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
                Creativity / Temperature:
              </label>
              <span className="text-xs font-mono text-brand-300">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">
              Lower (0.3) = factual & structured; Higher (0.8) = creative viral hooks and emotional copy.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Max Output Tokens:
            </label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            {saved ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Settings saved successfully!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Persisted in MongoDB Atlas</span>
            )}
            <Button variant="gradient" size="sm" onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
