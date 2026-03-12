import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function toBR(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2).replace(".", ",");
}

function getAlunoId(obj) {
  return obj?.id ?? obj?.Id ?? "";
}

function getAlunoNome(obj) {
  return obj?.nome ?? obj?.Nome ?? "";
}

function getAlunoRa(obj) {
  return obj?.ra ?? obj?.RA ?? "";
}

function getAlunoTurma(obj) {
  return obj?.turma ?? obj?.Turma ?? "";
}

function getDisciplina(obj) {
  return obj?.disciplina ?? obj?.Disciplina ?? "";
}

function buildApiMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data ||
    fallback
  );
}

async function downloadBoletimPdf(alunoId) {
  const res = await api.get(`/Notas/boletim/${alunoId}`, {
    responseType: "blob",
  });

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
  const [inputs, setInputs] = useState({});
  const [savingCell, setSavingCell] = useState({});

  const STORAGE_KEY_TURMA = "notas_professor_turmaSelecionada";
  const [turmaSelecionada, setTurmaSelecionada] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TURMA) || "";
    } catch {
      return "";
    }
  });

  const initializedRef = useRef(false);

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
      const [resAlunos, resNotas] = await Promise.all([
        api.get("/Alunos"),
        api.get("/Notas/professor"),
      ]);

      const alunosArr = Array.isArray(resAlunos.data) ? resAlunos.data : [];
      const notasArr = Array.isArray(resNotas.data) ? resNotas.data : [];

      setAlunos(alunosArr);
      setNotas(notasArr);

      if (!initializedRef.current) {
        initializedRef.current = true;

        const turmasDisponiveis = Array.from(
          new Set(
            alunosArr
              .map((x) => String(getAlunoTurma(x)).trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (!turmaSelecionada) {
          setTurmaSelecionada(turmasDisponiveis[0] || "");
        }
      }

      if (showToast) toast.success("Notas atualizadas.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar notas.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
  }, []);

  const turmas = useMemo(() => {
    const set = new Set();

    for (const aluno of alunos) {
      const turma = String(getAlunoTurma(aluno)).trim();
      if (turma) set.add(turma);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [alunos]);

  const disciplinaAtual = useMemo(() => {
    const set = new Set();

    for (const nota of notas) {
      const disciplina = String(getDisciplina(nota)).trim();
      if (disciplina) set.add(disciplina);
    }

    return set.size === 1 ? Array.from(set)[0] : "";
  }, [notas]);

  const alunosDaTurma = useMemo(() => {
    if (!turmaSelecionada) return alunos;

    return alunos.filter((aluno) => {
      return String(getAlunoTurma(aluno)).trim() === String(turmaSelecionada).trim();
    });
  }, [alunos, turmaSelecionada]);

  const notasIndex = useMemo(() => {
    const idx = {};

    for (const nota of notas) {
      const alunoId = String(nota?.alunoId ?? nota?.AlunoId ?? "");
      const tipo = String(nota?.tipo ?? nota?.Tipo ?? "");
      const disciplina = String(getDisciplina(nota)).trim();

      if (!alunoId || !tipo) continue;
      if (disciplinaAtual && disciplina !== disciplinaAtual) continue;

      if (!idx[alunoId]) idx[alunoId] = {};
      idx[alunoId][tipo] = {
        valor: nota?.valor ?? nota?.Valor,
      };
    }

    return idx;
  }, [notas, disciplinaAtual]);

  useEffect(() => {
    setInputs((prev) => {
      const next = { ...prev };

      for (const aluno of alunosDaTurma) {
        const alunoId = String(getAlunoId(aluno));
        if (!alunoId) continue;

        const base = next[alunoId] ? { ...next[alunoId] } : {};
        const atual = notasIndex[alunoId] || {};

        if (base.Atividade === undefined || base.Atividade === "") {
          const v = atual.Atividade?.valor;
          base.Atividade = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }

        if (base.P1 === undefined || base.P1 === "") {
          const v = atual.P1?.valor;
          base.P1 = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }

        if (base.P2 === undefined || base.P2 === "") {
          const v = atual.P2?.valor;
          base.P2 = v === null || v === undefined ? "" : String(v).replace(".", ",");
        }

        next[alunoId] = base;
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

  function calcMedia(alunoId) {
    const key = String(alunoId);

    const atividade = parseNota(inputs[key]?.Atividade ?? notasIndex[key]?.Atividade?.valor);
    const p1 = parseNota(inputs[key]?.P1 ?? notasIndex[key]?.P1?.valor);
    const p2 = parseNota(inputs[key]?.P2 ?? notasIndex[key]?.P2?.valor);

    if (atividade === null && p1 === null && p2 === null) return null;

    return ((atividade ?? 0) + (p1 ?? 0) + (p2 ?? 0)) / 3;
  }

  async function salvarNota(alunoId, tipo) {
    const alunoIdNum = Number(alunoId);

    if (!alunoIdNum) {
      toast.error("Aluno inválido.");
      return;
    }

    const raw = inputs[String(alunoId)]?.[tipo] ?? "";
    const valor = Number(String(raw).replace(",", "."));

    if (Number.isNaN(valor) || valor < 0 || valor > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }

    const cellKey = `${alunoId}-${tipo}`;
    setSavingCell((prev) => ({ ...prev, [cellKey]: true }));

    try {
      await api.post("/Notas", {
        alunoId: alunoIdNum,
        tipo,
        valor,
      });

      toast.success("Nota salva.");
      await loadAll(false);
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao salvar nota.")));
    } finally {
      setSavingCell((prev) => ({ ...prev, [cellKey]: false }));
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
                <b>Disciplina:</b> {disciplinaAtual}
              </>
            ) : (
              "Disciplina do professor será identificada automaticamente."
            )}
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
              {turmas.map((turma) => (
                <option key={turma} value={turma}>
                  {turma}
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
              {alunosDaTurma.map((aluno) => {
                const alunoId = String(getAlunoId(aluno));
                const nome = getAlunoNome(aluno);
                const media = calcMedia(alunoId);

                const cellAtividade = `${alunoId}-Atividade`;
                const cellP1 = `${alunoId}-P1`;
                const cellP2 = `${alunoId}-P2`;

                return (
                  <tr key={alunoId || nome}>
                    <td>
                      <div>
                        <b>{nome}</b>
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        RA: {getAlunoRa(aluno)} · Turma: {getAlunoTurma(aluno)}
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[alunoId]?.Atividade ?? ""}
                          onChange={(e) => setInput(alunoId, "Atividade", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(alunoId, "Atividade")}
                          disabled={!!savingCell[cellAtividade]}
                        >
                          {savingCell[cellAtividade] ? "..." : "Salvar"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[alunoId]?.P1 ?? ""}
                          onChange={(e) => setInput(alunoId, "P1", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(alunoId, "P1")}
                          disabled={!!savingCell[cellP1]}
                        >
                          {savingCell[cellP1] ? "..." : "Salvar"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          value={inputs[alunoId]?.P2 ?? ""}
                          onChange={(e) => setInput(alunoId, "P2", e.target.value)}
                          placeholder="0 a 10"
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => salvarNota(alunoId, "P2")}
                          disabled={!!savingCell[cellP2]}
                        >
                          {savingCell[cellP2] ? "..." : "Salvar"}
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

      const alunoId = getAlunoId(me.data);
      const detalhesRes = await api.get(`/Notas/aluno-detalhes/${alunoId}`);

      setDetalhes(Array.isArray(detalhesRes.data) ? detalhesRes.data : []);

      if (showToast) toast.success("Notas atualizadas.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar suas notas.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  async function baixar() {
    if (!aluno) return;

    setDownloading(true);
    try {
      await downloadBoletimPdf(getAlunoId(aluno));
      toast.success("Boletim aberto em nova aba.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao gerar o boletim.")));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Minhas notas</h4>

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
              <b>{getAlunoNome(aluno)}</b> — RA: <b>{getAlunoRa(aluno)}</b> — Turma:{" "}
              <b>{getAlunoTurma(aluno)}</b>
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
                {detalhes.map((item) => (
                  <tr key={String(item?.disciplina ?? item?.Disciplina)}>
                    <td>{String(item?.disciplina ?? item?.Disciplina)}</td>
                    <td>{toBR(item?.atividade ?? item?.Atividade)}</td>
                    <td>{toBR(item?.p1 ?? item?.P1)}</td>
                    <td>{toBR(item?.p2 ?? item?.P2)}</td>
                    <td>
                      <b>{toBR(item?.media ?? item?.Media)}</b>
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
      const { data } = await api.get("/Alunos");
      setAlunos(Array.isArray(data) ? data : []);

      if (showToast) toast.success("Lista de alunos atualizada.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar alunos.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlunos(false);
  }, []);

  async function carregarDetalhes(id) {
    setDetalhes([]);

    if (!id) return;

    try {
      const { data } = await api.get(`/Notas/aluno-detalhes/${id}`);
      setDetalhes(Array.isArray(data) ? data : []);
      toast.success("Notas do aluno carregadas.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar notas do aluno.")));
    }
  }

  async function baixar() {
    if (!alunoId) return;

    setDownloading(true);
    try {
      await downloadBoletimPdf(alunoId);
      toast.success("Boletim aberto em nova aba.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao gerar o boletim.")));
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
                  const value = e.target.value;
                  setAlunoId(value);
                  carregarDetalhes(value);
                }}
              >
                <option value="">Selecione...</option>
                {alunos.map((aluno) => (
                  <option key={String(getAlunoId(aluno))} value={String(getAlunoId(aluno))}>
                    {getAlunoNome(aluno)} — RA: {getAlunoRa(aluno)} — Turma: {getAlunoTurma(aluno)}
                  </option>
                ))}
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
                {detalhes.map((item) => (
                  <tr key={String(item?.disciplina ?? item?.Disciplina)}>
                    <td>{String(item?.disciplina ?? item?.Disciplina)}</td>
                    <td>{toBR(item?.atividade ?? item?.Atividade)}</td>
                    <td>{toBR(item?.p1 ?? item?.P1)}</td>
                    <td>{toBR(item?.p2 ?? item?.P2)}</td>
                    <td>
                      <b>{toBR(item?.media ?? item?.Media)}</b>
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