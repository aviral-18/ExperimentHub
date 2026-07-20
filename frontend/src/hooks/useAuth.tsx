import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/services/endpoints";
import { getToken, setToken } from "@/services/api";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; full_name: string; password: string; role?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
  }

  async function register(payload: { email: string; full_name: string; password: string; role?: string }) {
    const res = await authApi.register(payload);
    setToken(res.access_token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
