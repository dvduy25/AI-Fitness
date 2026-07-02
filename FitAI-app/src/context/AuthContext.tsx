import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { storage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { authApi, RegisterPayload } from "@/api/auth";
import { initApiClient } from "@/api/client";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await initApiClient();
      try {
        const token = await storage.getItem(STORAGE_KEYS.token);
        if (token) {
          const cachedUser = await storage.getItem(STORAGE_KEYS.user);
          if (cachedUser) setUser(JSON.parse(cachedUser));
          const freshUser = await authApi.me();
          setUser(freshUser);
          await storage.setItem(STORAGE_KEYS.user, JSON.stringify(freshUser));
        }
      } catch {
        await storage.removeItem(STORAGE_KEYS.token);
        await storage.removeItem(STORAGE_KEYS.user);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(async (token: string, nextUser: User) => {
    await storage.setItem(STORAGE_KEYS.token, token);
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      await persistSession(res.token, res.user);
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await authApi.register(payload);
      await persistSession(res.token, res.user);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await storage.removeItem(STORAGE_KEYS.token);
    await storage.removeItem(STORAGE_KEYS.user);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const freshUser = await authApi.me();
    setUser(freshUser);
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(freshUser));
  }, []);

  const updateLocalUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshProfile,
      updateLocalUser,
    }),
    [user, isLoading, login, register, logout, refreshProfile, updateLocalUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
