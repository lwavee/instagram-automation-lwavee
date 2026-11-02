"use client";

import React, { useState, useEffect } from "react";
import {
  Workflow,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertOctagon,
  FileCode,
  ExternalLink,
  Layers,
  Database,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

const workflowsList = [
  {
    code: "workflow-a-research",
    name: "Workflow A — Daily Content Research",
    trigger: "Scheduled (Daily 08:00 AM IST)",
    purpose: "Scans real tech feeds for trending AI/ChatGPT/Gemini topics & populates research database.",
    status: "Active",
  },
  {
    code: "workflow-b-script-generation",
    name: "Workflow B — AI Script Generation",
    trigger: "Webhook / On Demand",
    purpose: "Transforms approved topics into viral Hindi/Hinglish Reel scripts with 2s hooks & scene breakdowns.",
    status: "Active",
  },
  {
    code: "workflow-c-content-approval",
    name: "Workflow C — Content Approval Gate",
    trigger: "Webhook Event",
    purpose: "Human-in-the-loop gate: alerts dashboard and pauses publishing until explicit user approval.",
    status: "Active",
  },
  {
    code: "workflow-d-publishing",
    name: "Workflow D — Content Publishing",
    trigger: "Scheduled (Every 15 mins)",
    purpose: "Polls due scheduled posts, checks Instagram API connection, and creates publishing containers.",
    status: "Active",
  },
  {
    code: "workflow-e-analytics",
    name: "Workflow E — Analytics Synchronization",
    trigger: "Scheduled (Daily 11:55 PM IST)",
    purpose: "Syncs official Meta impressions, reach, and follower count into analytics snapshots.",
    status: "Active",
  },
  {
    code: "workflow-f-error-monitoring",
    name: "Workflow F — Error Monitoring & Auto-Retry",
    trigger: "Error Trigger",
    purpose: "Detects failed workflow nodes, logs stack traces, and triggers notification alerts.",
    status: "Active",
  },
];

export default function AutomationWorkflowsPage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedExec, setSelectedExec] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await api.getExecutions();
      if (data?.executions) {
        setExecutions(data.executions);
      }
    } catch (err: any) {
      console.warn("Could not load executions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, []);

  const handleTrigger = async (code: string) => {
    try {
      setLoading(true);
      setStatusMsg(`Triggering ${code}...`);
      await api.triggerWorkflow(code);
      setStatusMsg("Workflow executed successfully!");
      loadExecutions();
    } catch (err: any) {
      setStatusMsg(`Execution error: ${err.message}`);
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
            <Workflow className="w-8 h-8 text-brand-400" />
            n8n Automation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Production n8n Community Edition workflows with retry handling, idempotency, and execution logs.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadExecutions} className="gap-2">
          <RotateCw className="w-4 h-4" />
          Refresh Executions
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

      {/* Database & Architecture Note */}
      <Card className="border-border/80 bg-secondary/20 p-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-foreground block mb-0.5">
              Dual-Database Production Architecture
            </span>
            <span className="text-muted-foreground leading-relaxed">
              <strong>MongoDB Atlas</strong> is the primary application database for Learn With Avee (scripts, users, posts, media). <strong>n8n internal persistence</strong> uses an external PostgreSQL database per official n8n requirements.
            </span>
          </div>
        </div>
      </Card>

      {/* Workflows Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflowsList.map((wf) => (
          <Card key={wf.code} className="flex flex-col justify-between hover:border-brand-500/40 transition-all p-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <Badge variant="success">{wf.status}</Badge>
                <span className="text-[11px] text-muted-foreground font-mono">{wf.trigger}</span>
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1.5">{wf.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{wf.purpose}</p>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-brand-400 font-medium">Ready</span>
              <Button
                size="sm"
                variant="gradient"
                onClick={() => handleTrigger(wf.code)}
                isLoading={loading}
                className="text-xs gap-1.5 h-8 px-3"
              >
                <Play className="w-3.5 h-3.5" /> Run Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Execution History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Execution History ({executions.length})</CardTitle>
          <CardDescription>Real-time audit log of automated and triggered workflow runs</CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Workflow</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {executions.map((exec) => (
                <tr key={exec._id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">{exec.workflowName}</td>
                  <td className="py-3 px-4 text-muted-foreground capitalize">{exec.triggerType}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDate(exec.startedAt)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{exec.durationMs || 0} ms</td>
                  <td className="py-3 px-4 text-muted-foreground">{exec.itemsProcessed || 0}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        exec.status === "completed"
                          ? "success"
                          : exec.status === "failed"
                          ? "destructive"
                          : "default"
                      }
                    >
                      {exec.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedExec(exec);
                        setDetailModalOpen(true);
                      }}
                      className="text-xs text-brand-300 hover:text-brand-200"
                    >
                      View Logs
                    </Button>
                  </td>
                </tr>
              ))}

              {executions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No executions recorded yet. Click &quot;Run Now&quot; on any workflow above to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Execution Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Execution Details"
        description={selectedExec?.workflowName}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 space-y-1 text-xs">
            <div><strong>Status:</strong> {selectedExec?.status}</div>
            <div><strong>Items Processed:</strong> {selectedExec?.itemsProcessed || 0}</div>
            <div><strong>Summary:</strong> {selectedExec?.payloadSummary || "None"}</div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Execution Logs:</h4>
            <div className="max-h-56 overflow-y-auto p-3 rounded-lg bg-black/60 font-mono text-[11px] text-muted-foreground space-y-1 border border-border">
              {selectedExec?.logs?.map((l: any, i: number) => (
                <div key={i}>
                  [{new Date(l.timestamp).toLocaleTimeString()}] {l.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
