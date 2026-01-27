import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../api/client";
import { normalizeRole } from "./role";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("authToken");
    const username = localStorage.getItem("usuarioLogado");
    const role = localStorage.getItem("tipoUsuario");
    const mustChangePassword = localStorage.getItem("mustChangePassword") === "1";
    return token ? { token, username, role, mustChangePassword } : null;
  });

  async function login(username, password) {
    const { data } = await api.post("/Auth/login", { username, password });

    localStorage.setItem("authToken", data.token);
    localStorage.setItem("usuarioLogado", data.username);
    localStorage.setItem("tipoUsuario", normalizeRole(data.role));
    localStorage.setItem("mustChangePassword", data.mustChangePassword ? "1" : "0");

    setUser({
      token: data.token,
      username: data.username,
      role: normalizeRole(data.role),
      mustChangePassword: !!data.mustChangePassword,
    });

    return data;
  }

  function markPasswordChanged() {
    localStorage.setItem("mustChangePassword", "0");
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("mustChangePassword");
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout, markPasswordChanged }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
