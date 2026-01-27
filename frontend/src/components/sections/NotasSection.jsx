import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function toBR(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2).replace(".", ",");
}

function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

async function downloadBoletimPdf(alunoId) {
  const res = await api.get(`/Notas/boletim/${alunoId}`, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
}

export default function NotasSection({ role }) {
  if (role === "professor") return <NotasProfessor />;
  if (role === "aluno") return <NotasAluno />;
  if (role === "admin") return <NotasAdmin />;
  return <div className="text-muted">Perfil não reconhecido.</div>;
}

function NotasProfessor() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState([]);
  const [notas, setNotas] = useState([]);

  const [alunoId, setAlunoId] = useState("");
  const [tipo, setTipo] = useState("Atividade");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const [fTurma, setFTurma] = useState("");
  const [fAluno, setFAluno] = useState("");

  async function loadAll(showToast = false) {
    setLoading(true);
    try {
      const [a, n] = await Promise.all([api.get("/Alunos"), api.get("/Notas/professor")]);
      setAlunos(Array.isArray(a.data) ? a.data : []);
      setNotas(Array.isArray(n.data) ? n.data : []);
      if (showToast) toast.success("Notas atualizadas.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar notas${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turmas = useMemo(() => {
    const set = new Set();
    for (const n of notas) {
      const t = n.turma ?? n.Turma;
      if (t) set.add(String(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notas]);

  const notasFiltradas = useMemo(() => {
    return notas.filter((n) => {
      const turma = String(n.turma ?? n.Turma ?? "");
      const aId = String(n.alunoId ?? n.AlunoId ?? "");
      if (fTurma && turma !== fTurma) return false;
      if (fAluno && aId !== fAluno) return false;
      return true;
    });
  }, [notas, fTurma, fAluno]);

  async function lancarNota(e) {
    e.preventDefault();

    if (!alunoId) {
      toast.error("Selecione um aluno.");
      return;
    }

    const v = Number(String(valor).replace(",", "."));
    if (Number.isNaN(v) || v < 0 || v > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/Notas", { alunoId: Number(alunoId), tipo, valor: v });
      toast.success("Nota salva!");
      setValor("");
      await loadAll(false);
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao lançar/editar nota.";
      toast.error(String(apiMsg));
    } finally {
      setSaving(false);
    }
  }

  async function excluirNota(id) {
    try {
      await api.delete(`/Notas/${id}`);
      setNotas((prev) => prev.filter((x) => String(x.id ?? x.Id) !== String(id)));
      toast.success("Nota excluída.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao excluir nota.";
      toast.error(String(apiMsg));
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Notas (Professor)</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => loadAll(true)} disabled={loading}>
          {loading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          <div className="card p-3 mb-3">
            <h5 className="mb-2">Lançar / Editar nota</h5>
            <form onSubmit={lancarNota} className="row g-2 align-items-end">
              <div className="col-12 col-lg-6">
                <label className="form-label">Aluno</label>
                <select className="form-select" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {alunos.map((a) => {
                    const id = a.id ?? a.Id;
                    const nome = a.nome ?? a.Nome ?? "";
                    const turma = a.turma ?? a.Turma ?? "";
                    return (
                      <option key={String(id)} value={String(id)}>
                        {nome} ({turma})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-6 col-lg-3">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="Atividade">Atividade</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                </select>
              </div>

              <div className="col-6 col-lg-2">
                <label className="form-label">Nota (0 a 10)</label>
                <input className="form-control" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 7.5" />
              </div>

              <div className="col-12 col-lg-1 d-grid">
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? "..." : "Salvar"}
                </button>
              </div>

              <small className="text-muted">
                Se já existir nota do mesmo tipo para o aluno, o backend atualiza (upsert).
              </small>
            </form>
          </div>

          <div className="row g-2 align-items-end mb-2">
            <div className="col-12 col-md-4">
              <label className="form-label">Filtrar por Turma</label>
              <select className="form-select" value={fTurma} onChange={(e) => setFTurma(e.target.value)}>
                <option value="">Todas</option>
                {turmas.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label">Filtrar por Aluno</label>
              <select className="form-select" value={fAluno} onChange={(e) => setFAluno(e.target.value)}>
                <option value="">Todos</option>
                {alunos.map((a) => {
                  const id = a.id ?? a.Id;
                  const nome = a.nome ?? a.Nome ?? "";
                  const turma = a.turma ?? a.Turma ?? "";
                  return (
                    <option key={String(id)} value={String(id)}>
                      {nome} ({turma})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-12 col-md-3 text-muted">
              Total: <b>{notasFiltradas.length}</b>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>AlunoId</th>
                  <th>Turma</th>
                  <th>Disciplina</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th style={{ width: 120 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {notasFiltradas.map((n) => {
                  const id = n.id ?? n.Id;
                  return (
                    <tr key={String(id)}>
                      <td>{String(id)}</td>
                      <td>{String(n.alunoId ?? n.AlunoId)}</td>
                      <td>{String(n.turma ?? n.Turma ?? "")}</td>
                      <td>{String(n.disciplina ?? n.Disciplina ?? "")}</td>
                      <td>{String(n.tipo ?? n.Tipo ?? "")}</td>
                      <td>{toBR(n.valor ?? n.Valor)}</td>
                      <td>{formatDateTime(n.data ?? n.Data)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => excluirNota(String(id))}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {notasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-muted">Nenhuma nota encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function NotasAluno() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState(null);
  const [detalhes, setDetalhes] = useState([]);
  const [downloading, setDownloading] = useState(false);

  async function load(showToast = false) {
    setLoading(true);
    try {
      const me = await api.get("/Alunos/me");
      setAluno(me.data);

      const alunoId = me.data?.id ?? me.data?.Id;
      const det = await api.get(`/Notas/aluno-detalhes/${alunoId}`);
      setDetalhes(Array.isArray(det.data) ? det.data : []);

      if (showToast) toast.success("Notas atualizadas.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao carregar suas notas.";
      toast.error(String(apiMsg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function baixar() {
    if (!aluno) return;
    const alunoId = aluno.id ?? aluno.Id;

    setDownloading(true);
    try {
      await downloadBoletimPdf(alunoId);
      toast.success("Boletim aberto em nova aba.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao gerar/baixar o boletim.";
      toast.error(String(apiMsg));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Minhas Notas</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
            {loading ? "Atualizando..." : "Recarregar"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={baixar} disabled={loading || downloading || !aluno}>
            {downloading ? "Gerando..." : "Baixar boletim (PDF)"}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          {aluno && (
            <div className="text-muted mb-2">
              <b>{aluno.nome ?? aluno.Nome}</b> — RA: <b>{aluno.ra ?? aluno.RA}</b> — Turma:{" "}
              <b>{aluno.turma ?? aluno.Turma}</b>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Atividade</th>
                  <th>P1</th>
                  <th>P2</th>
                  <th>Média</th>
                </tr>
              </thead>
              <tbody>
                {detalhes.map((d) => (
                  <tr key={String(d.disciplina ?? d.Disciplina)}>
                    <td>{String(d.disciplina ?? d.Disciplina)}</td>
                    <td>{toBR(d.atividade ?? d.Atividade)}</td>
                    <td>{toBR(d.p1 ?? d.P1)}</td>
                    <td>{toBR(d.p2 ?? d.P2)}</td>
                    <td><b>{toBR(d.media ?? d.Media)}</b></td>
                  </tr>
                ))}

                {detalhes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">Nenhuma nota lançada ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function NotasAdmin() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [detalhes, setDetalhes] = useState([]);
  const [downloading, setDownloading] = useState(false);

  async function loadAlunos(showToast = false) {
    setLoading(true);
    try {
      const a = await api.get("/Alunos");
      setAlunos(Array.isArray(a.data) ? a.data : []);
      if (showToast) toast.success("Lista de alunos atualizada.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar alunos${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlunos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarDetalhes(idStr) {
    setDetalhes([]);
    if (!idStr) return;
    try {
      const det = await api.get(`/Notas/aluno-detalhes/${idStr}`);
      setDetalhes(Array.isArray(det.data) ? det.data : []);
      toast.success("Notas do aluno carregadas.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao carregar notas do aluno.";
      toast.error(String(apiMsg));
    }
  }

  async function baixar() {
    if (!alunoId) return;
    setDownloading(true);
    try {
      await downloadBoletimPdf(alunoId);
      toast.success("Boletim aberto em nova aba.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao gerar/baixar o boletim.";
      toast.error(String(apiMsg));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Notas (Admin)</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => loadAlunos(true)} disabled={loading}>
          {loading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-lg-7">
              <label className="form-label">Selecionar aluno</label>
              <select
                className="form-select"
                value={alunoId}
                onChange={(e) => {
                  const v = e.target.value;
                  setAlunoId(v);
                  carregarDetalhes(v);
                }}
              >
                <option value="">Selecione...</option>
                {alunos.map((a) => {
                  const id = a.id ?? a.Id;
                  const nome = a.nome ?? a.Nome ?? "";
                  const turma = a.turma ?? a.Turma ?? "";
                  const ra = a.ra ?? a.RA ?? "";
                  return (
                    <option key={String(id)} value={String(id)}>
                      {nome} — RA: {ra} — Turma: {turma}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="col-12 col-lg-5 d-grid">
              <button className="btn btn-primary" onClick={baixar} disabled={!alunoId || downloading}>
                {downloading ? "Gerando..." : "Baixar boletim (PDF)"}
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Atividade</th>
                  <th>P1</th>
                  <th>P2</th>
                  <th>Média</th>
                </tr>
              </thead>
              <tbody>
                {detalhes.map((d) => (
                  <tr key={String(d.disciplina ?? d.Disciplina)}>
                    <td>{String(d.disciplina ?? d.Disciplina)}</td>
                    <td>{toBR(d.atividade ?? d.Atividade)}</td>
                    <td>{toBR(d.p1 ?? d.P1)}</td>
                    <td>{toBR(d.p2 ?? d.P2)}</td>
                    <td><b>{toBR(d.media ?? d.Media)}</b></td>
                  </tr>
                ))}

                {alunoId && detalhes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">Nenhuma nota encontrada para este aluno.</td>
                  </tr>
                )}

                {!alunoId && (
                  <tr>
                    <td colSpan={5} className="text-muted">Selecione um aluno para visualizar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
