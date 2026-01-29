import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

function toISODateOnly(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CalendarioSection({ role }) {
  const toast = useToast();
  const canEdit = role === "admin" || role === "professor";

  const [loading, setLoading] = useState(true);
  const [eventosApi, setEventosApi] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState({
    titulo: "",
    dataInicio: "",
    dataFim: "",
  });

  const [saving, setSaving] = useState(false);

  async function loadEventos(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get("/Eventos");
      setEventosApi(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Eventos atualizados.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar eventos${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calendarEvents = useMemo(() => {
    return eventosApi.map((e) => {
      const id = e.id ?? e.Id;
      const titulo = e.titulo ?? e.Titulo ?? "";
      const inicio = e.dataInicio ?? e.DataInicio;
      const fim = e.dataFim ?? e.DataFim;

      const start = toISODateOnly(inicio);
      const end = fim ? toISODateOnly(addDays(fim, 1)) : undefined;

      return {
        id: String(id),
        title: String(titulo),
        start,
        end,
        allDay: true,
        extendedProps: { raw: e },
      };
    });
  }, [eventosApi]);

  function openCreate(dateObj) {
    setMode("create");
    setSelectedId(null);
    setForm({
      titulo: "",
      dataInicio: toISODateOnly(dateObj),
      dataFim: "",
    });
    setModalOpen(true);
  }

  function openEdit(eventClickInfo) {
    const ev = eventClickInfo.event;
    const raw = ev.extendedProps?.raw || {};
    const id = raw.id ?? raw.Id ?? ev.id;

    const dataInicio = raw.dataInicio ?? raw.DataInicio ?? ev.startStr;
    const dataFim = raw.dataFim ?? raw.DataFim ?? null;

    setMode("edit");
    setSelectedId(String(id));
    setForm({
      titulo: raw.titulo ?? raw.Titulo ?? ev.title ?? "",
      dataInicio: toISODateOnly(dataInicio),
      dataFim: dataFim ? toISODateOnly(dataFim) : "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setSelectedId(null);
    setForm({ titulo: "", dataInicio: "", dataFim: "" });
  }

  function validate() {
    if (!form.titulo.trim()) return "Informe o título.";
    if (!form.dataInicio) return "Informe a data de início.";
    if (form.dataFim) {
      const ini = new Date(form.dataInicio);
      const fim = new Date(form.dataFim);
      if (fim < ini) return "Data fim não pode ser menor que a data início.";
    }
    return "";
  }

  async function save() {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }
    if (!canEdit) {
      toast.error("Sem permissão para alterar eventos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        dataInicio: form.dataInicio,
        dataFim: form.dataFim ? form.dataFim : null,
      };

      if (mode === "create") {
        await api.post("/Eventos", payload);
        toast.success("Evento criado!");
      } else {
        await api.put(`/Eventos/${selectedId}`, payload);
        toast.success("Evento atualizado!");
      }

      closeModal();
      await loadEventos(false);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao salvar evento (verifique permissões).";
      toast.error(String(apiMsg));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!canEdit) {
      toast.error("Sem permissão para excluir eventos.");
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/Eventos/${selectedId}`);
      toast.success("Evento excluído!");
      closeModal();
      await loadEventos(false);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao excluir evento (verifique permissões).";
      toast.error(String(apiMsg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Calendário</h4>

        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadEventos(true)}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Recarregar"}
          </button>

          {canEdit && (
            <button className="btn btn-sm btn-primary" onClick={() => openCreate(new Date())} disabled={loading}>
              Novo evento
            </button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="card p-2">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            events={calendarEvents}
            selectable={canEdit}
            dateClick={(info) => {
              if (!canEdit) return;
              openCreate(info.date);
            }}
            eventClick={(info) => {
              openEdit(info);
            }}
          />
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">{mode === "create" ? "Novo evento" : "Editar evento"}</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeModal} disabled={saving}>
                Fechar
              </button>
            </div>

            <div className="row g-2">
              <div className="col-12">
                <label className="form-label">Título</label>
                <input
                  className="form-control"
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  disabled={!canEdit || saving}
                />
              </div>

              <div className="col-6">
                <label className="form-label">Data início</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dataInicio}
                  onChange={(e) => setForm((p) => ({ ...p, dataInicio: e.target.value }))}
                  disabled={!canEdit || saving}
                />
              </div>

              <div className="col-6">
                <label className="form-label">Data fim (opcional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dataFim}
                  onChange={(e) => setForm((p) => ({ ...p, dataFim: e.target.value }))}
                  disabled={!canEdit || saving}
                />
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              {canEdit ? (
                <>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </button>

                  {mode === "edit" && (
                    <button className="btn btn-outline-danger" onClick={remove} disabled={saving}>
                      {saving ? "Excluindo..." : "Excluir"}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-muted">Visualização apenas.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
