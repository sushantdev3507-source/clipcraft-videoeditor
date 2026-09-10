"use client";

// ClipCraft authentication state.
// Backed by the real ClipCraft account API:
//   POST /api/v1/auth/register, POST /api/v1/auth/login,
//   GET  /api/v1/auth/me,       PUT  /api/v1/auth/profile
// The session token lives in the shared API client (src/lib/api.ts), which
// attaches it to every authenticated request. There is no logout endpoint, so
// signing out clears the stored token and cached user locally.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  authApi,
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
  type AuthUser,
} from "@/lib/api";

export type { AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  /** false until the stored session has been checked against the backend */
  ready: boolean;
  signIn: (credentials: { email: string; password: string }, remember?: boolean) => Promise<void>;
  signUp: (details: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => void;
  updateProfile: (changes: { name?: string; email?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Any 401 from anywhere in the app means the session is gone: clear it and
  // send the user back to the login screen instead of hanging.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      queryClient.clear();
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router, queryClient]);

  // Session restoration: never trust a stored user object — ask the backend.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    let active = true;
    authApi
      .me()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        // 401 already cleared the token via the unauthorized handler.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }, remember = false) => {
      const data = await authApi.login({ email, password });
      setToken(data.token, remember);
      setUser(data.user);
      setReady(true);
    },
    [],
  );

  const signUp = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      // Register does not return a token, so log in straight afterwards.
      await authApi.register({ name, email, password });
      const data = await authApi.login({ email, password });
      setToken(data.token, true);
      setUser(data.user);
      setReady(true);
    },
    [],
  );

  const updateProfile = useCallback(async (changes: { name?: string; email?: string }) => {
    const body: { name?: string; email?: string } = {};
    if (changes.name !== undefined) body.name = changes.name;
    if (changes.email !== undefined) body.email = changes.email;
    const data = await authApi.updateProfile(body);
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut, updateProfile }),
    [user, ready, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
