"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await register({ name, email, password });
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-pink-600 to-amber-500 mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-brand-500/20">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Learn With Avee
          </h1>
          <p className="text-xs text-muted-foreground">
            Create your AI Instagram Automation Account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-foreground">Register New Account</h2>

          {error && (
            <div className="p-3 text-xs rounded-lg bg-destructive/15 border border-destructive/30 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Full Name:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Avee Lohar"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 pl-8"
                />
                <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Email Address:
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="avee@learnwithavee.com"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 pl-8"
                />
                <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Password (min 8 chars):
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 pl-8"
                />
                <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="md"
              isLoading={loading}
              className="w-full gap-2 shadow-lg shadow-brand-500/20"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-300 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

