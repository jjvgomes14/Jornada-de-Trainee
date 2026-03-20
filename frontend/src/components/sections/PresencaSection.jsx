import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

function buildApiMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data || fallback;
}

function toInputDate(value) {
  if (!value) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateBR(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

export default function PresencaSection({ role }) {
  if (role === "professor") return <PresencaProfessor />;
  if (role === "aluno") return <PresencaAluno />;
  return <div className="alert alert-warning">Seção disponível apenas para professores e alunos.</div>;
}

function PresencaProfessor() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [lista, setLista] = useState([]);
  const [dataAula, setDataAula] = useState(() => toInputDate(""));
  const [aula, setAula] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  async function carregar(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get(`/Presencas/professor?dataAula=${dataAula}`);
      const arr = Array.isArray(data) ? data : [];
      setLista(arr);

      if (!aula) {
        const primeiraAula = arr.find((item) => String(item?.aula || "").trim())?.aula || "";
        if (primeiraAula) setAula(primeiraAula);
      }

      if (showToast) toast.success("Lista de presença atualizada.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar a lista de presença.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar(false);
  }, [dataAula]);

  const turmas = useMemo(() => {
    const set = new Set();
    for (const item of lista) {
      const turma = String(item?.turma || "").trim();
      if (turma) set.add(turma);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [lista]);

  const listaFiltrada = useMemo(() => {
    const base = !turmaFiltro
      ? lista
      : lista.filter((item) => String(item?.turma || "").trim() === String(turmaFiltro).trim());

    return [...base].sort((a, b) =>
      String(a?.alunoNome || "").localeCompare(String(b?.alunoNome || ""), "pt-BR", {
        sensitivity: "base",
      })
    );
  }, [lista, turmaFiltro]);

  async function registrar(alunoId, status) {
    if (!aula.trim()) {
      toast.error("Informe o nome da aula antes de registrar presença.");
      return;
    }

    const key = `${alunoId}-${status}`;
    setSavingKey(key);

    try {
      await api.post("/Presencas/registrar", {
        alunoId,
        dataAula,
        aula: aula.trim(),
        status,
      });

      setLista((prev) =>
        prev.map((item) =>
          Number(item?.alunoId) === Number(alunoId)
            ? {
                ...item,
                aula: aula.trim(),
                status,
                dataAula,
              }
            : item
        )
      );

      toast.success(`Presença registrada como ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao registrar presença.")));
    } finally {
      setSavingKey("");
    }
  }

  const professorNome = lista[0]?.professorNome || "Professor";
  const disciplina = lista[0]?.disciplina || "";

  return (
    <div className="card p-3 shadow-sm">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-1">Presença</h4>
          <div className="text-muted small">
            {professorNome}
            {disciplina ? ` • ${disciplina}` : ""}
          </div>
        </div>
        <button className="btn btn-outline-primary" onClick={() => carregar(true)} disabled={loading}>
          Atualizar
        </button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label className="form-label">Data da aula</label>
          <input
            type="date"
            className="form-control"
            value={dataAula}
            onChange={(e) => setDataAula(e.target.value)}
          />
        </div>
        <div className="col-md-5">
          <label className="form-label">Nome da aula</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ex.: Aula 01 - Introdução"
            value={aula}
            onChange={(e) => setAula(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Filtrar por turma</label>
          <select
            className="form-select"
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma} value={turma}>
                {turma}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="alert alert-info mb-0">Carregando lista de presença...</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="alert alert-warning mb-0">Nenhum aluno encontrado para esta listagem.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>RA</th>
                <th>Turma</th>
                <th>Aula</th>
                <th>Status atual</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item) => {
                const alunoId = Number(item?.alunoId || 0);
                const statusAtual = String(item?.status || "");
                const aulaAtual = String(item?.aula || "");
                const salvandoPresente = savingKey === `${alunoId}-Presente`;
                const salvandoFalta = savingKey === `${alunoId}-Falta`;

                return (
                  <tr key={alunoId}>
                    <td>{item?.alunoNome || "-"}</td>
                    <td>{item?.ra || "-"}</td>
                    <td>{item?.turma || "-"}</td>
                    <td>{aulaAtual || "-"}</td>
                    <td>
                      {!statusAtual ? (
                        <span className="badge text-bg-secondary">Não lançado</span>
                      ) : statusAtual === "Presente" ? (
                        <span className="badge text-bg-success">Presente</span>
                      ) : (
                        <span className="badge text-bg-danger">Falta</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2 flex-wrap">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => registrar(alunoId, "Presente")}
                          disabled={!!savingKey}
                        >
                          {salvandoPresente ? "Salvando..." : "Presente"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => registrar(alunoId, "Falta")}
                          disabled={!!savingKey}
                        >
                          {salvandoFalta ? "Salvando..." : "Falta"}
                        </button>
                      </div>
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

function PresencaAluno() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [faltas, setFaltas] = useState([]);

  async function carregar(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get("/Presencas/aluno");
      const arr = Array.isArray(data) ? data : [];
      setFaltas(arr);
      if (showToast) toast.success("Faltas atualizadas.");
    } catch (err) {
      toast.error(String(buildApiMessage(err, "Falha ao carregar faltas.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar(false);
  }, []);

  return (
    <div className="card p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
        <div>
          <h4 className="mb-1">Minhas faltas</h4>
          <div className="text-muted small">Aqui aparecem todas as faltas registradas para o seu usuário.</div>
        </div>
        <button className="btn btn-outline-primary" onClick={() => carregar(true)} disabled={loading}>
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="alert alert-info mb-0">Carregando faltas...</div>
      ) : faltas.length === 0 ? (
        <div className="alert alert-success mb-0">Nenhuma falta cadastrada até o momento.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Data</th>
                <th>Aula</th>
                <th>Disciplina</th>
                <th>Professor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {faltas.map((item) => (
                <tr key={item?.id ?? `${item?.dataAula}-${item?.aula}`}>
                  <td>{formatDateBR(item?.dataAula)}</td>
                  <td>{item?.aula || "-"}</td>
                  <td>{item?.disciplina || "-"}</td>
                  <td>{item?.professorNome || "-"}</td>
                  <td>
                    <span className="badge text-bg-danger">{item?.status || "Falta"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}