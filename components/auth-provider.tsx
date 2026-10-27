"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.data ?? null);
        return data.data ?? null;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
