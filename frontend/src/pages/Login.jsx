import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import MatriculaModal from "../components/MatriculaModal";
import ThemeSwitch from "../components/ThemeSwitch";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const [openMatricula, setOpenMatricula] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!usuario.trim() || !senha.trim()) {
      toast.error("Informe usuário e senha.");
      return;
    }

    setLoading(true);
    try {
      await login(usuario.trim(), senha);
      localStorage.setItem("dashboardActiveSection", "home");
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Usuário ou senha inválidos.";
      toast.error(String(apiMsg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <div className="card p-4 login-caixa">
        {/* topo com botão de tema */}
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div>
            <h2 className="mb-2 brand-title">EduConnect</h2>
            <p className="brand-subtitle mb-3">Acesse com seu usuário e senha.</p>
          </div>

          <ThemeSwitch />
        </div>

        <form onSubmit={handleLogin}>
          <label className="form-label">Usuário</label>
          <input
            className="form-control mb-2"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="ex: admin"
          />

          <label className="form-label">Senha</label>
          <input
            className="form-control mb-3"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />

          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {/* TROCA AQUI: secondary -> primary (fica legível no dark) */}
          <button
            type="button"
            className="btn btn-outline-primary w-100 mt-2"
            onClick={() => setOpenMatricula(true)}
          >
            Solicitar matrícula
          </button>
        </form>
      </div>

      <MatriculaModal open={openMatricula} onClose={() => setOpenMatricula(false)} />
    </div>
  );
}
