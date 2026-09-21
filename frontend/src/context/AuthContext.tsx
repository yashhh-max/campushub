"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, TokenPair, LoginPayload, RegisterPayload } from "@/types/auth";
import {
  loginUser,
  registerUser,
  fetchMe,
  refreshAccessToken,
  logoutUser,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  tokens: TokenPair | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "campushub_auth_tokens";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedTokensStr = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedTokensStr) {
          setIsLoading(false);
          return;
        }

        const storedTokens: TokenPair = JSON.parse(storedTokensStr);
        setTokens(storedTokens);

        try {
          // Attempt validating access token
          const userData = await fetchMe(storedTokens.access);
          setUser(userData);
        } catch {
          // Try refreshing token if access expired
          try {
            const newAccess = await refreshAccessToken(storedTokens.refresh);
            const updatedTokens = { ...storedTokens, access: newAccess };
            setTokens(updatedTokens);
            localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(updatedTokens));

            const userData = await fetchMe(newAccess);
            setUser(userData);
          } catch {
            // Both expired or invalid
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setTokens(null);
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await loginUser(payload);
    setUser(response.user);
    setTokens(response.tokens);
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(response.tokens));
  };

  const register = async (payload: RegisterPayload) => {
    const response = await registerUser(payload);
    setUser(response.user);
    setTokens(response.tokens);
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(response.tokens));
  };

  const logout = async () => {
    if (tokens) {
      await logoutUser(tokens.refresh, tokens.access);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setTokens(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        token: tokens?.access || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
