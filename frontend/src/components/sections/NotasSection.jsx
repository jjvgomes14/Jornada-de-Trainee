import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function toBR(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2).replace(".", ",");
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

/* =========================================================
   PROFESSOR (tabela intuitiva + filtro NÃO reseta)
========================================================= */
function NotasProfessor() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState([]);
  const [notas, setNotas] = useState([]);

  // ✅ filtro de turma (persistido)
  const STORAGE_KEY_TURMA = "notas_professor_turmaSelecionada";
  const [turmaSelecionada, setTurmaSelecionada] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TURMA) || "";
    } catch {
      return "";
    }
  });

  // ✅ evita "setar padrão" automaticamente em toda atualização
  const initializedRef = useRef(false);

  // inputs por aluno/tipo (controlados)
  const [inputs, setInputs] = useState({});

  // loading por célula
  const [savingCell, setSavingCell] = useState({});

  // sempre que mudar a turma, salva no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TURMA, turmaSelecionada || "");
    } catch {
      // ignore
    }
  }, [turmaSelecionada]);

  async function loadAll(showToast = false) {
    setLoading(true);
    try {
      const [a, n] = await Promise.all([api.get("/Alunos"), api.get("/Notas/professor")]);
      const alunosArr = Array.isArray(a.data) ? a.data : [];
      const notasArr = Array.isArray(n.data) ? n.data : [];

      setAlunos(alunosArr);
      setNotas(notasArr);

      // ✅ Só define turma padrão UMA VEZ (na primeira carga) e SOMENTE se estiver vazia
      if (!initializedRef.current) {
        initializedRef.current = true;

        const turmasDisponiveis = Array.from(
          new Set(
            alunosArr
              .map((x) => String(x.turma ?? x.Turma ?? "").trim())
              .filter((t) => t)
          )
        ).sort((x, y) => x.localeCompare(y));

        if (!turmaSelecionada) {
          setTurmaSelecionada(turmasDisponiveis[0] || "");
        }
      }

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
    for (const a of alunos) {
      const t = a.turma ?? a.Turma ?? "";
      const v = String(t).trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [alunos]);

  // disciplina atual do professor (se existir só uma)
  const disciplinaAtual = useMemo(() => {
    const set = new Set();
    for (const n of notas) {
      const d = n.disciplina ?? n.Disciplina;
      const v = String(d ?? "").trim();
      if (v) set.add(v);
    }
    return set.size === 1 ? Array.from(set)[0] : "";
  }, [notas]);

  const alunosDaTurma = useMemo(() => {
    if (!turmaSelecionada) return alunos;
    return alunos.filter((a) => {
      const t = String(a.turma ?? a.Turma ?? "").trim();
      return t === String(turmaSelecionada).trim();
    });
  }, [alunos, turmaSelecionada]);

  const notasIndex = useMemo(() => {
    const idx = {};
    for (const n of notas) {
      const alunoId = String(n.alunoId ?? n.AlunoId ?? "");
      const tipo = String(n.tipo ?? n.Tipo ?? "");
      const disciplina = String(n.disciplina ?? n.Disciplina ?? "");

      if (!alunoId || !tipo) continue;
      if (disciplinaAtual && disciplina !== disciplinaAtual) continue;

      if (!idx[alunoId]) idx[alunoId] = {};
      idx[alunoId][tipo] = { valor: n.valor ?? n.Valor };
    }
    return idx;
  }, [notas, disciplinaAtual]);

  // sincroniza inputs com notas existentes SEM sobrescrever digitação atual
  useEffect(() => {
    setInputs((prev) => {
      const next = { ...prev };

      for (const a of alunosDaTurma) {
        const aId = String(a.id ?? a.Id ?? "");
        if (!aId) continue;

        const base = next[aId] ? { ...next[aId] } : {};
        const current = notasIndex[aId] || {};

        if (base.Atividade === undefined || base.Atividade === "") {
          const v = current.Atividade?.valor;
          base.Atividade = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }
        if (base.P1 === undefined || base.P1 === "") {
          const v = current.P1?.valor;
          base.P1 = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }
        if (base.P2 === undefined || base.P2 === "") {
          const v = current.P2?.valor;
          base.P2 = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }

        next[aId] = base;
      }

      return next;
    });
  }, [alunosDaTurma, notasIndex]);

  function setInput(alunoId, tipo, value) {
    setInputs((prev) => ({
      ...prev,
      [alunoId]: {
        ...(prev[alunoId] || {}),
        [tipo]: value,
      },
    }));
  }

  function parseNota(v) {
    const n = Number(String(v).replace(",", "."));
    if (Number.isNaN(n)) return null;
    return n;
  }

  function calcMedia(aId) {
    const aKey = String(aId);
    const valAt = parseNota(inputs[aKey]?.Atividade ?? notasIndex[aKey]?.Atividade?.valor);
    const valP1 = parseNota(inputs[aKey]?.P1 ?? notasIndex[aKey]?.P1?.valor);
    const valP2 = parseNota(inputs[aKey]?.P2 ?? notasIndex[aKey]?.P2?.valor);

    if (valAt === null && valP1 === null && valP2 === null) return null;
    const media = ((valAt ?? 0) + (valP1 ?? 0) + (valP2 ?? 0)) / 3;
    return media;
  }

  async function salvarNota(alunoId, tipo) {
    const aIdNum = Number(alunoId);
    if (!aIdNum) {
      toast.error("Aluno inválido.");
      return;
    }

    const raw = inputs[String(alunoId)]?.[tipo] ?? "";
    const v = Number(String(raw).replace(",", "."));

    if (Number.isNaN(v) || v < 0 || v > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }

    const key = `${alunoId}-${tipo}`;
    setSavingCell((p) => ({ ...p, [key]: true }));

    try {
      await api.post("/Notas", { alunoId: aIdNum, tipo, valor: v });
      toast.success("Nota salva!");

      // ✅ recarrega dados SEM mexer no filtro
      await loadAll(false);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao lançar/editar nota.";
      toast.error(String(apiMsg));
    } finally {
      setSavingCell((p) => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div>
          <h4 className="m-0">Lançamento de notas</h4>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {disciplinaAtual ? (
              <>
                {" "}
                <b>Disciplina:</b> {disciplinaAtual}
              </>
            ) : null}
          </div>
        </div>

        <div className="d-flex gap-2 align-items-end">
          <div style={{ minWidth: 220 }}>
            <label className="form-label mb-1">Turma</label>
            <select
              className="form-select form-select-sm"
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              disabled={loading}
            >
              <option value="">Todas</option>
              {turmas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadAll(true)}
            disabled={loading}
            style={{ height: 31 }}
          >
            {loading ? "Atualizando..." : "Recarregar"}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Aluno</th>
                <th style={{ minWidth: 210 }}>Atividade</th>
                <th style={{ minWidth: 210 }}>P1</th>
                <th style={{ minWidth: 210 }}>P2</th>
                <th style={{ width: 90, textAlign: "right" }}>Média</th>
              </tr>
            </thead>

            <tbody>
              {alunosDaTurma.map((a) => {
                const aId = String(a.id ?? a.Id ?? "");
                const nome = String(a.nome ?? a.Nome ?? "");

                const media = calcMedia(aId);

                const cellKeyAt = `${aId}-Atividade`;
                const cellKeyP1 = `${aId}-P1`;
                const cellKeyP2 = `${aId}-P2`;

                return (
                  <tr key={aId || nome}>
                    <td>{nome}</td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[aId]?.Atividade ?? ""}
                          onChange={(e) => setInput(aId, "Atividade", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(aId, "Atividade")}
                          disabled={!!savingCell[cellKeyAt]}
                        >
                          {savingCell[cellKeyAt] ? "..." : "Salvar"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[aId]?.P1 ?? ""}
                          onChange={(e) => setInput(aId, "P1", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(aId, "P1")}
                          disabled={!!savingCell[cellKeyP1]}
                        >
                          {savingCell[cellKeyP1] ? "..." : "Salvar"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[aId]?.P2 ?? ""}
                          onChange={(e) => setInput(aId, "P2", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(aId, "P2")}
                          disabled={!!savingCell[cellKeyP2]}
                        >
                          {savingCell[cellKeyP2] ? "..." : "Salvar"}
                        </button>
                      </div>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <b>{media === null ? "—" : toBR(media)}</b>
                    </td>
                  </tr>
                );
              })}

              {alunosDaTurma.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Nenhum aluno encontrado para esta turma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ALUNO (mantido)
========================================================= */
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
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao carregar suas notas.";
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
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao gerar/baixar o boletim.";
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
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => load(true)}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Recarregar"}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={baixar}
            disabled={loading || downloading || !aluno}
          >
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
                    <td>
                      <b>{toBR(d.media ?? d.Media)}</b>
                    </td>
                  </tr>
                ))}

                {detalhes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Nenhuma nota lançada ainda.
                    </td>
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

/* =========================================================
   ADMIN (mantido)
========================================================= */
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
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao carregar notas do aluno.";
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
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao gerar/baixar o boletim.";
      toast.error(String(apiMsg));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Notas (Admin)</h4>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => loadAlunos(true)}
          disabled={loading}
        >
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
              <button
                className="btn btn-primary"
                onClick={baixar}
                disabled={!alunoId || downloading}
              >
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
                    <td>
                      <b>{toBR(d.media ?? d.Media)}</b>
                    </td>
                  </tr>
                ))}

                {alunoId && detalhes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Nenhuma nota encontrada para este aluno.
                    </td>
                  </tr>
                )}

                {!alunoId && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Selecione um aluno para visualizar.
                    </td>
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
