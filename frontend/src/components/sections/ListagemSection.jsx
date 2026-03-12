import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";
import { useAuth } from "../../auth/AuthContext";
import { normalizeRole } from "../../auth/role";

function buildApiErrorMessage(err) {
  const data = err?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const errorsObj = data.errors && typeof data.errors === "object" ? data.errors : data;

    const msgs = [];
    for (const key of Object.keys(errorsObj)) {
      const val = errorsObj[key];

      if (Array.isArray(val)) {
        for (const msg of val) {
          if (typeof msg === "string" && msg.trim()) msgs.push(msg.trim());
        }
      } else if (typeof val === "string" && val.trim()) {
        msgs.push(val.trim());
      }
    }

    if (msgs.length) return msgs.join(" | ");
  }

  const status = err?.response?.status;
  if (status) return `Falha na requisição (HTTP ${status}).`;

  return "Ocorreu um erro ao processar a operação.";
}

function getId(obj) {
  return obj?.id ?? obj?.Id ?? "";
}

function getNome(obj) {
  return obj?.nome ?? obj?.Nome ?? obj?.name ?? "";
}

function getEmail(obj) {
  return obj?.email ?? obj?.Email ?? "";
}

function getRa(obj) {
  return obj?.ra ?? obj?.RA ?? "";
}

function getTurma(obj) {
  return (
    obj?.turma ??
    obj?.Turma ??
    obj?.nomeTurma ??
    obj?.NomeTurma ??
    obj?.turmaNome ??
    obj?.TurmaNome ??
    ""
  );
}

function getDisciplina(obj) {
  return obj?.disciplina ?? obj?.Disciplina ?? "";
}

export default function ListagemSection() {
  const toast = useToast();
  const { user } = useAuth();

  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const isAdmin = role === "admin";
  const canAccess = role === "admin" || role === "professor";

  const [loading, setLoading] = useState(true);

  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);

  const [tab, setTab] = useState("alunos");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [disciplinaFiltro, setDisciplinaFiltro] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const [editFormAluno, setEditFormAluno] = useState({
    id: "",
    nome: "",
    email: "",
    ra: "",
    turma: "",
  });

  const [editFormProfessor, setEditFormProfessor] = useState({
    id: "",
    nome: "",
    email: "",
    disciplina: "",
    dataNascimento: null,
    usuarioId: null,
  });

  const [delOpen, setDelOpen] = useState(false);
  const [delType, setDelType] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  async function loadAll(showToast = false) {
    if (!canAccess) {
      setLoading(false);
      return;
    }

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
      toast.error(buildApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
  }, [canAccess]);

  const alunosFiltrados = useMemo(() => {
    if (!turmaFiltro) return alunos;

    return alunos.filter((aluno) => {
      return String(getTurma(aluno)).toLowerCase() === String(turmaFiltro).toLowerCase();
    });
  }, [alunos, turmaFiltro]);

  const disciplinas = useMemo(() => {
    const set = new Set();

    for (const professor of professores) {
      const disciplina = String(getDisciplina(professor)).trim();
      if (disciplina) set.add(disciplina);
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [professores]);

  const professoresFiltrados = useMemo(() => {
    if (!disciplinaFiltro) return professores;

    return professores.filter((professor) => {
      return String(getDisciplina(professor)).toLowerCase() === String(disciplinaFiltro).toLowerCase();
    });
  }, [professores, disciplinaFiltro]);

  function openEditAluno(aluno) {
    setEditType("aluno");
    setEditFormAluno({
      id: String(getId(aluno)),
      nome: String(getNome(aluno)),
      email: String(getEmail(aluno)),
      ra: String(getRa(aluno)),
      turma: String(getTurma(aluno)),
    });
    setEditOpen(true);
  }

  function openEditProfessor(professor) {
    setEditType("professor");
    setEditFormProfessor({
      id: String(getId(professor)),
      nome: String(getNome(professor)),
      email: String(getEmail(professor)),
      disciplina: String(getDisciplina(professor)),
      dataNascimento: professor?.dataNascimento ?? professor?.DataNascimento ?? null,
      usuarioId: professor?.usuarioId ?? professor?.UsuarioId ?? null,
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (editLoading) return;
    setEditOpen(false);
    setEditType(null);
  }

  function validateEdit() {
    if (editType === "aluno") {
      if (!editFormAluno.nome.trim()) return "Informe o nome do aluno.";
      if (!editFormAluno.email.trim()) return "Informe o e-mail do aluno.";
      if (!editFormAluno.ra.trim()) return "Informe o RA do aluno.";
      if (!editFormAluno.turma.trim()) return "Informe a turma do aluno.";
      return "";
    }

    if (editType === "professor") {
      if (!editFormProfessor.nome.trim()) return "Informe o nome do professor.";
      if (!editFormProfessor.email.trim()) return "Informe o e-mail do professor.";
      if (!editFormProfessor.disciplina.trim()) return "Informe a disciplina do professor.";
      return "";
    }

    return "Tipo de edição inválido.";
  }

  async function submitEdit() {
    const msg = validateEdit();

    if (msg) {
      toast.error(msg);
      return;
    }

    setEditLoading(true);

    try {
      if (editType === "aluno") {
        const id = Number(editFormAluno.id);

        await api.put(`/Alunos/${id}`, {
          id,
          nome: editFormAluno.nome.trim(),
          email: editFormAluno.email.trim(),
          ra: editFormAluno.ra.trim(),
          turma: editFormAluno.turma.trim(),
        });

        toast.success("Aluno atualizado.");
      }

      if (editType === "professor") {
        const id = Number(editFormProfessor.id);

        await api.put(`/Professores/${id}`, {
          id,
          nome: editFormProfessor.nome.trim(),
          email: editFormProfessor.email.trim(),
          disciplina: editFormProfessor.disciplina.trim(),
          dataNascimento: editFormProfessor.dataNascimento,
          usuarioId: editFormProfessor.usuarioId,
        });

        toast.success("Professor atualizado.");
      }

      closeEdit();
      await loadAll(false);
    } catch (err) {
      toast.error(buildApiErrorMessage(err));
    } finally {
      setEditLoading(false);
    }
  }

  function openDelete(type, item) {
    setDelType(type);
    setDelItem(item);
    setDelOpen(true);
  }

  function closeDelete() {
    if (delLoading) return;

    setDelOpen(false);
    setDelType(null);
    setDelItem(null);
  }

  async function confirmDelete() {
    if (!delType || !delItem) return;

    setDelLoading(true);

    try {
      const id = getId(delItem);

      if (!id) {
        toast.error("ID inválido para exclusão.");
        return;
      }

      if (delType === "aluno") {
        await api.delete(`/Alunos/${id}`);
        toast.success("Aluno excluído.");
      } else if (delType === "professor") {
        await api.delete(`/Professores/${id}`);
        toast.success("Professor excluído.");
      }

      closeDelete();
      await loadAll(false);
    } catch (err) {
      toast.error(buildApiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
  }

  if (!canAccess) {
    return (
      <div className="card p-3">
        <h4 className="m-0 mb-2">Listagem</h4>
        <div className="text-muted">
          Esta seção está disponível apenas para administrador e professor.
        </div>
      </div>
    );
  }

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
                  <label className="form-label">Filtrar por turma</label>
                  <select
                    className="form-select"
                    value={turmaFiltro}
                    onChange={(e) => setTurmaFiltro(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {turmas.map((turma) => (
                      <option key={String(turma)} value={String(turma)}>
                        {String(turma)}
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
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>RA</th>
                      <th>Turma</th>
                      {isAdmin && <th style={{ width: 180 }}>Ações</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {alunosFiltrados.map((aluno) => (
                      <tr key={String(getId(aluno)) || `${getNome(aluno)}-${getEmail(aluno)}`}>
                        <td>{String(getNome(aluno))}</td>
                        <td>{String(getEmail(aluno))}</td>
                        <td>{String(getRa(aluno))}</td>
                        <td>{String(getTurma(aluno))}</td>

                        {isAdmin && (
                          <td className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditAluno(aluno)}
                            >
                              Editar
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openDelete("aluno", aluno)}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {alunosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="text-muted">
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
              <div className="row g-2 align-items-end mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Filtrar por disciplina</label>
                  <select
                    className="form-select"
                    value={disciplinaFiltro}
                    onChange={(e) => setDisciplinaFiltro(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {disciplinas.map((disciplina) => (
                      <option key={String(disciplina)} value={String(disciplina)}>
                        {String(disciplina)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 text-muted">
                  Total: <b>{professoresFiltrados.length}</b>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Disciplina</th>
                      {isAdmin && <th style={{ width: 180 }}>Ações</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {professoresFiltrados.map((professor) => (
                      <tr
                        key={String(getId(professor)) || `${getNome(professor)}-${getEmail(professor)}`}
                      >
                        <td>{String(getNome(professor))}</td>
                        <td>{String(getEmail(professor))}</td>
                        <td>{String(getDisciplina(professor))}</td>

                        {isAdmin && (
                          <td className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditProfessor(professor)}
                            >
                              Editar
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openDelete("professor", professor)}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {professoresFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 4 : 3} className="text-muted">
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

      {editOpen && isAdmin && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">
                {editType === "aluno" ? "Editar Aluno" : "Editar Professor"}
              </h5>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={closeEdit}
                disabled={editLoading}
              >
                Fechar
              </button>
            </div>

            {editType === "aluno" ? (
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-control"
                    value={editFormAluno.nome}
                    onChange={(e) =>
                      setEditFormAluno((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">E-mail</label>
                  <input
                    className="form-control"
                    type="email"
                    value={editFormAluno.email}
                    onChange={(e) =>
                      setEditFormAluno((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label">RA</label>
                  <input
                    className="form-control"
                    value={editFormAluno.ra}
                    onChange={(e) =>
                      setEditFormAluno((prev) => ({ ...prev, ra: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label">Turma</label>
                  <input
                    className="form-control"
                    value={editFormAluno.turma}
                    onChange={(e) =>
                      setEditFormAluno((prev) => ({ ...prev, turma: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label">Nome</label>
                  <input
                    className="form-control"
                    value={editFormProfessor.nome}
                    onChange={(e) =>
                      setEditFormProfessor((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">E-mail</label>
                  <input
                    className="form-control"
                    type="email"
                    value={editFormProfessor.email}
                    onChange={(e) =>
                      setEditFormProfessor((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={editLoading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Disciplina</label>
                  <input
                    className="form-control"
                    value={editFormProfessor.disciplina}
                    onChange={(e) =>
                      setEditFormProfessor((prev) => ({
                        ...prev,
                        disciplina: e.target.value,
                      }))
                    }
                    disabled={editLoading}
                  />
                </div>
              </div>
            )}

            <div className="d-grid mt-3">
              <button className="btn btn-primary" onClick={submitEdit} disabled={editLoading}>
                {editLoading ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {delOpen && isAdmin && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Confirmar exclusão</h5>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={closeDelete}
                disabled={delLoading}
              >
                Fechar
              </button>
            </div>

            <div className="mb-3">
              Tem certeza que deseja excluir{" "}
              {delType === "aluno" ? "o aluno" : "o professor"}{" "}
              <b>{String(getNome(delItem))}</b>?
              <div className="text-muted mt-1">Essa ação não pode ser desfeita.</div>
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button
                className="btn btn-outline-secondary"
                onClick={closeDelete}
                disabled={delLoading}
              >
                Cancelar
              </button>

              <button className="btn btn-danger" onClick={confirmDelete} disabled={delLoading}>
                {delLoading ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}