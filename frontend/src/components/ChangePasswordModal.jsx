import { useState } from "react";
import { api } from "../api/client";
import { useToast } from "../ui/ToastContext";

export default function ChangePasswordModal({ open, username, onSuccess }) {
  const toast = useToast();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!senhaAtual || !novaSenha || !confirmacao) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (novaSenha !== confirmacao) {
      toast.error("A confirmação não confere com a nova senha.");
      return;
    }
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/Auth/alterar-senha-primeiro-acesso", {
        username,
        senhaAtual,
        novaSenha,
      });

      toast.success("Senha alterada com sucesso!");
      onSuccess?.();
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Erro ao alterar senha. Verifique a senha atual e tente novamente.";
      toast.error(String(apiMsg));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h5 className="mb-2">Troca de senha obrigatória</h5>
        <p className="text-muted">
          Este é seu primeiro acesso. Você precisa trocar a senha para continuar.
        </p>

        <form onSubmit={handleSubmit} className="row g-2">
          <div className="col-12">
            <label className="form-label">Senha atual</label>
            <input
              type="password"
              className="form-control"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Nova senha</label>
            <input
              type="password"
              className="form-control"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Confirmar nova senha</label>
            <input
              type="password"
              className="form-control"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12 mt-2 d-grid">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Alterar senha"}
            </button>
          </div>
        </form>

        <hr />
        <small className="text-muted">
          Usuário: <b>{username}</b>
        </small>
      </div>
    </div>
  );
}
