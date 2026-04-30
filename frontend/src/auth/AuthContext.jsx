import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { normalizeRole } from "./role";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: "authToken",
  username: "usuarioLogado",
  role: "tipoUsuario",
  mustChangePassword: "mustChangePassword",
};

function readSession() {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const username = localStorage.getItem(STORAGE_KEYS.username);
  const role = localStorage.getItem(STORAGE_KEYS.role);
  const mustChangePassword = localStorage.getItem(STORAGE_KEYS.mustChangePassword) === "1";

  if (!token) return null;

  return {
    token,
    username: username || "",
    role: normalizeRole(role),
    mustChangePassword,
  };
}

function writeSession(session) {
  localStorage.setItem(STORAGE_KEYS.token, session.token || "");
  localStorage.setItem(STORAGE_KEYS.username, session.username || "");
  localStorage.setItem(STORAGE_KEYS.role, normalizeRole(session.role));
  localStorage.setItem(
    STORAGE_KEYS.mustChangePassword,
    session.mustChangePassword ? "1" : "0"
  );
}

function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.username);
  localStorage.removeItem(STORAGE_KEYS.role);
  localStorage.removeItem(STORAGE_KEYS.mustChangePassword);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());
  const [bootstrapping, setBootstrapping] = useState(true);

  async function login(username, password) {
    const { data } = await api.post("/Auth/login", { username, password });

    const session = {
      token: data.token,
      username: data.username,
      role: normalizeRole(data.role),
      mustChangePassword: !!data.mustChangePassword,
    };

    writeSession(session);
    setUser(session);

    return data;
  }

  function logout() {
    clearSessionStorage();
    setUser(null);
  }

  function markPasswordChanged() {
    setUser((prev) => {l
      if (!prev) return prev;

      const next = {
        ...prev,
        mustChangePassword: false,
      };

      writeSession(next);
      return next;
    });
  }

  async function refreshUser() {
    const current = readSession();

    if (!current?.token) {
      setUser(null);
      setBootstrapping(false);
      return;
    }

    try {
      const { data } = await api.get("/Auth/me");

      const next = {
        token: current.token,
        username: data?.username ?? current.username,
        role: normalizeRole(data?.role ?? current.role),
        mustChangePassword: !!(data?.primeiroAcesso ?? data?.PrimeiroAcesso),
      };

      writeSession(next);
      setUser(next);
    } catch {
      clearSessionStorage();
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      markPasswordChanged,
      refreshUser,
      bootstrapping,
    }),
    [user, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}