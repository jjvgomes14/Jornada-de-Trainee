import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

export default function NotificacoesSection() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);

  async function load(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get("/Notificacoes/eventos");
      setItems(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Notificações atualizadas.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar notificações${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeOne(id) {
    const idStr = String(id);
    setBusyId(idStr);

    try {
      // DELETE individual (rota que você adicionou no backend)
      await api.delete(`/Notificacoes/eventos/${idStr}`);

      setItems((prev) => prev.filter((x) => String(x.id ?? x.Id) !== idStr));
      toast.success("Notificação excluída.");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao excluir notificação.";
      toast.error(String(apiMsg));
    } finally {
      setBusyId(null);
    }
  }

  async function removeAll() {
    if (items.length === 0) return;

    setBusyAll(true);
    try {
      // DELETE limpar tudo (rota que você adicionou no backend)
      await api.delete("/Notificacoes/eventos");

      setItems([]);
      toast.success("Todas as notificações foram removidas.");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao limpar notificações.";
      toast.error(String(apiMsg));
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Notificações</h4>

        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => load(true)}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Recarregar"}
          </button>

          <button
            className="btn btn-sm btn-outline-danger"
            onClick={removeAll}
            disabled={busyAll || loading || items.length === 0}
          >
            {busyAll ? "Limpando..." : "Limpar tudo"}
          </button>
        </div>
      </div>

      <div className="text-muted mb-3">
        Total: <b>{items.length}</b>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-muted">Nenhuma notificação encontrada.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Mensagem</th>
                <th style={{ width: 140 }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {items.map((n) => {
                const id = n.id ?? n.Id;
                const eventoTitulo = n.eventoTitulo ?? n.EventoTitulo ?? "-";
                const mensagem = n.mensagem ?? n.Mensagem ?? "-";

                const disabled = busyAll || busyId === String(id);

                return (
                  <tr key={String(id)}>
                    <td>{String(eventoTitulo)}</td>
                    <td>{String(mensagem)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={disabled}
                        onClick={() => removeOne(String(id))}
                      >
                        {busyId === String(id) ? "Excluindo..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
