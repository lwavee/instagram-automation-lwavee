"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  preferences: {
    defaultLanguage: "hi-en" | "hi" | "en";
    autoPublishEnabled: boolean;
    defaultTimezone: string;
    targetTopics: string[];
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.removeItem("lwavee_auth_token");
    localStorage.removeItem("lwavee_user");
    void refreshUser();
  }, []);

  const login: AuthContextType["login"] = async (credentials) => {
    const data = await api.login(credentials);
    setUser(data.user);
  };

  const register: AuthContextType["register"] = async (details) => {
    const data = await api.register(details);
    setUser(data.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

