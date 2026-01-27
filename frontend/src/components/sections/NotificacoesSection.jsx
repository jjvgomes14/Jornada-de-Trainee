import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function NotificacoesSection() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((n) => {
      const msg = String(n.mensagem ?? n.Mensagem ?? "").toLowerCase();
      const tituloEvento = String(n.eventoTitulo ?? n.EventoTitulo ?? "").toLowerCase();
      const data = String(n.dataCriacao ?? n.DataCriacao ?? "").toLowerCase();
      return msg.includes(q) || tituloEvento.includes(q) || data.includes(q);
    });
  }, [items, query]);

  async function removeOne(id) {
    setBusyId(String(id));
    try {
      await api.delete(`/Notificacoes/${id}`);
      setItems((prev) => prev.filter((x) => String(x.id ?? x.Id) !== String(id)));
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
      for (const n of items) {
        const id = n.id ?? n.Id;
        await api.delete(`/Notificacoes/${id}`);
      }
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
          <button className="btn btn-sm btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
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

      <div className="row g-2 align-items-end mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Buscar</label>
          <input
            className="form-control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para filtrar..."
          />
        </div>

        <div className="col-12 col-md-6 text-muted">
          Total: <b>{filtered.length}</b>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted">Nenhuma notificação encontrada.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>Data</th>
                <th>Evento</th>
                <th>Mensagem</th>
                <th style={{ width: 140 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const id = n.id ?? n.Id;
                const dataCriacao = n.dataCriacao ?? n.DataCriacao;
                const eventoTitulo = n.eventoTitulo ?? n.EventoTitulo ?? "-";
                const mensagem = n.mensagem ?? n.Mensagem ?? "-";

                const disabled = busyAll || busyId === String(id);

                return (
                  <tr key={String(id)}>
                    <td>{formatDateTime(dataCriacao)}</td>
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

          <small className="text-muted d-block mt-2">
            Notificações são geradas quando eventos são criados no calendário.
          </small>
        </div>
      )}
    </div>
  );
}
