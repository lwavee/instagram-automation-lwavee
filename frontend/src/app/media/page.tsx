"use client";

import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  UploadCloud,
  FileVideo,
  FileImage,
  FileAudio,
  Trash2,
  ExternalLink,
  Plus,
  X,
  Copy,
  Tag,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatNumber, formatDate } from "@/lib/utils";

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [campaign, setCampaign] = useState("");
  const [topic, setTopic] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const loadMedia = async () => {
    try {
      setLoading(true);
      const query = filterType ? `fileType=${filterType}` : "";
      const data = await api.getMedia(query);
      if (data?.assets) {
        setAssets(data.assets);
      }
    } catch (err: any) {
      console.warn("Could not load media:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [filterType]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("title", title || fileToUpload.name);
      if (campaign) formData.append("campaign", campaign);
      if (topic) formData.append("topic", topic);

      await api.uploadMedia(formData);
      setStatusMsg("Media asset uploaded successfully!");
      setUploadModalOpen(false);
      setFileToUpload(null);
      setTitle("");
      setCampaign("");
      setTopic("");
      loadMedia();
    } catch (err: any) {
      setStatusMsg(`Upload error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMedia(id);
      setAssets(assets.filter((a) => a._id !== id));
      setStatusMsg("Media asset deleted.");
    } catch (err: any) {
      setStatusMsg(`Delete error: ${err.message}`);
    }
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-brand-400" />
            Media Asset Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Persistent storage abstraction for video clips, audio tracks, and Reel covers.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setUploadModalOpen(true)}
          className="gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          Upload New Asset
        </Button>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["", "video", "image", "audio"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              filterType === type
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {type === "" ? "All Assets" : `${type}s`}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <Card key={asset._id} className="overflow-hidden flex flex-col justify-between p-4 group">
            <div>
              {/* Media Preview Box */}
              <div className="h-40 rounded-lg bg-secondary/80 flex items-center justify-center relative overflow-hidden mb-3 border border-border/60">
                {asset.fileType === "video" ? (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileVideo className="w-10 h-10 text-brand-400 mb-1" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">MP4 Reel</span>
                  </div>
                ) : asset.fileType === "image" ? (
                  <img
                    src={asset.url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <FileAudio className="w-10 h-10 text-amber-400" />
                )}

                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/70 text-white font-semibold backdrop-blur-sm">
                  {(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <h4 className="font-semibold text-xs text-foreground truncate mb-1">
                {asset.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  {asset.storageProvider}
                </Badge>
                <span>• {formatDate(asset.createdAt).split(",")[0]}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={() => copyUrl(asset._id, asset.url)}
                className="text-xs text-muted-foreground hover:text-brand-300 flex items-center gap-1 transition-colors"
                title="Copy Media URL"
              >
                {copiedId === asset._id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>URL</span>
              </button>

              <button
                onClick={() => handleDelete(asset._id)}
                className="text-xs text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                title="Delete Asset"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}

        {assets.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs text-muted-foreground">
            No media assets found in this filter. Click &quot;Upload New Asset&quot; to add videos or images!
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Media Asset"
        description="Supported formats: MP4, MOV, JPG, PNG, WEBP, MP3 (Max 100MB)"
      >
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Select File:
            </label>
            <input
              type="file"
              required
              accept="video/*,image/*,audio/*"
              onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
              className="w-full text-xs text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Asset Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gemini 2.5 Demo Clip"
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Campaign:
              </label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. AI Week 2026"
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Topic:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. AI Tools"
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/80">
            <Button variant="outline" size="sm" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" size="sm" type="submit" isLoading={loading}>
              Upload Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

