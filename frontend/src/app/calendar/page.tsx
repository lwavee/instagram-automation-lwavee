"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Trash2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

export default function ContentCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getCalendarEvents();
      if (data?.events) {
        setEvents(data.events);
      }
    } catch (err: any) {
      console.warn("Could not load calendar events:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedPost || !newDateTime) return;
    try {
      await api.reschedulePost(selectedPost.id, {
        newPublishTime: new Date(newDateTime).toISOString(),
        timezone: "Asia/Kolkata",
      });
      setStatusMsg("Post rescheduled successfully!");
      setRescheduleModalOpen(false);
      loadEvents();
    } catch (err: any) {
      setStatusMsg(`Reschedule error: ${err.message}`);
    }
  };

  // Calendar matrix calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("en-IN", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-brand-400" />
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timezone: Asia/Kolkata (IST) • Real-time publishing schedule & approval queue
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} className="p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
            {monthName} {year}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth} className="p-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
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

      {/* Calendar Grid Card */}
      <Card className="p-6">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {paddingArray.map((p) => (
            <div key={`pad-${p}`} className="h-28 rounded-xl bg-secondary/10 border border-border/20" />
          ))}

          {daysArray.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = events.filter((e) => {
              if (!e.date) return false;
              return e.date.startsWith(dateStr);
            });

            const isToday =
              new Date().toISOString().startsWith(dateStr);

            return (
              <div
                key={day}
                className={`h-28 p-2 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                  isToday
                    ? "bg-brand-500/10 border-brand-500/40 ring-1 ring-brand-500/30"
                    : "bg-card/40 border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? "text-brand-400" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>

                {/* Posts preview for this day */}
                <div className="space-y-1 overflow-y-auto">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setSelectedPost(ev);
                        setRescheduleModalOpen(true);
                      }}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/90 hover:bg-secondary truncate block border border-border/40 text-foreground"
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                          ev.status === "published"
                            ? "bg-emerald-400"
                            : ev.status === "scheduled"
                            ? "bg-brand-400"
                            : "bg-amber-400"
                        }`}
                      />
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-muted-foreground block text-center">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Post Scheduling Details"
        description={selectedPost?.title}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Status:</span>
              <Badge variant={selectedPost?.status === "published" ? "success" : "default"}>
                {selectedPost?.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Current Schedule:</span>
              <span className="text-foreground font-semibold">
                {formatDate(selectedPost?.date)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Publishing Mode:</span>
              <span className="text-brand-300 font-semibold">
                {selectedPost?.isAutoPublish ? "Auto Publish" : "Manual Human Approval"}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Select New Schedule Date & Time (Asia/Kolkata):
            </label>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/80">
            <Button variant="outline" size="sm" onClick={() => setRescheduleModalOpen(false)}>
              Close
            </Button>
            <Button variant="gradient" size="sm" onClick={handleRescheduleSubmit}>
              Save New Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

