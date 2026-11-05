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
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (typeof window !== "undefined") {
        const cachedUser = localStorage.getItem("lwavee_user");
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {}
        }

        const token = localStorage.getItem("lwavee_auth_token");
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }
      }

      const data = await api.getMe();
      if (data?.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("lwavee_user", JSON.stringify(data.user));
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("lwavee_auth_token");
          localStorage.removeItem("lwavee_user");
        }
      }
    } catch {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("lwavee_auth_token");
        localStorage.removeItem("lwavee_user");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    const data = await api.login(credentials);
    if (data?.token && typeof window !== "undefined") {
      localStorage.setItem("lwavee_auth_token", data.token);
    }
    if (data?.user) {
      setUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("lwavee_user", JSON.stringify(data.user));
      }
    }
  };

  const register = async (userData: any) => {
    const data = await api.register(userData);
    if (data?.token && typeof window !== "undefined") {
      localStorage.setItem("lwavee_auth_token", data.token);
    }
    if (data?.user) {
      setUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("lwavee_user", JSON.stringify(data.user));
      }
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("lwavee_auth_token");
        localStorage.removeItem("lwavee_user");
      }
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
