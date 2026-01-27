import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

export default function ListagemSection() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);

  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);

  const [tab, setTab] = useState("alunos");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  async function loadAll(showToast = false) {
    setLoading(true);
    try {
      const [a, p, t] = await Promise.all([
        api.get("/Alunos"),
        api.get("/Professores"),
        api.get("/Alunos/turmas"),
      ]);

      setAlunos(Array.isArray(a.data) ? a.data : []);
      setProfessores(Array.isArray(p.data) ? p.data : []);
      setTurmas(Array.isArray(t.data) ? t.data : []);

      if (showToast) toast.success("Listagem atualizada.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar listagem${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alunosFiltrados = useMemo(() => {
    if (!turmaFiltro) return alunos;
    return alunos.filter((x) => {
      const turma =
        x.turma ?? x.Turma ?? x.nomeTurma ?? x.NomeTurma ?? x.turmaNome ?? x.TurmaNome ?? "";
      return String(turma).toLowerCase() === String(turmaFiltro).toLowerCase();
    });
  }, [alunos, turmaFiltro]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h4 className="m-0">Listagem</h4>

        <div className="d-flex flex-wrap gap-2">
          <button
            className={`btn btn-sm ${tab === "alunos" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("alunos")}
          >
            Alunos
          </button>
          <button
            className={`btn btn-sm ${tab === "professores" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setTab("professores")}
          >
            Professores
          </button>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadAll(true)}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Recarregar"}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          {tab === "alunos" && (
            <>
              <div className="row g-2 align-items-end mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Filtrar por Turma</label>
                  <select
                    className="form-select"
                    value={turmaFiltro}
                    onChange={(e) => setTurmaFiltro(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {turmas.map((t) => (
                      <option key={String(t)} value={String(t)}>
                        {String(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 text-muted">
                  Total: <b>{alunosFiltrados.length}</b>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Turma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosFiltrados.map((a) => {
                      const id = a.id ?? a.Id ?? "";
                      const nome = a.nome ?? a.Nome ?? a.name ?? "";
                      const email = a.email ?? a.Email ?? "";
                      const turma =
                        a.turma ?? a.Turma ?? a.nomeTurma ?? a.NomeTurma ?? a.turmaNome ?? a.TurmaNome ?? "";
                      return (
                        <tr key={String(id) || `${nome}-${email}`}>
                          <td>{String(id)}</td>
                          <td>{String(nome)}</td>
                          <td>{String(email)}</td>
                          <td>{String(turma)}</td>
                        </tr>
                      );
                    })}

                    {alunosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "professores" && (
            <>
              <div className="text-muted mb-2">
                Total: <b>{professores.length}</b>
              </div>

              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Disciplina</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professores.map((p) => {
                      const id = p.id ?? p.Id ?? "";
                      const nome = p.nome ?? p.Nome ?? p.name ?? "";
                      const email = p.email ?? p.Email ?? "";
                      const disciplina = p.disciplina ?? p.Disciplina ?? "";
                      return (
                        <tr key={String(id) || `${nome}-${email}`}>
                          <td>{String(id)}</td>
                          <td>{String(nome)}</td>
                          <td>{String(email)}</td>
                          <td>{String(disciplina)}</td>
                        </tr>
                      );
                    })}

                    {professores.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          Nenhum professor encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
