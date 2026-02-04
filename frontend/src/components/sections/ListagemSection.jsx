import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";
import { useAuth } from "../../auth/AuthContext";
import { normalizeRole } from "../../auth/role";

function buildApiErrorMessage(err) {
  const data = err?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data === "string" && data.trim()) return data;

  // ASP.NET ModelState: { field: [ "msg1", "msg2" ], ... } ou { errors: { ... } }
  if (data && typeof data === "object") {
    const errorsObj = data.errors && typeof data.errors === "object" ? data.errors : data;

    const msgs = [];
    for (const key of Object.keys(errorsObj)) {
      const val = errorsObj[key];
      if (Array.isArray(val)) {
        for (const m of val) if (typeof m === "string" && m.trim()) msgs.push(m.trim());
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

export default function ListagemSection() {
  const toast = useToast();
  const { user } = useAuth();
  const role = useMemo(() => normalizeRole(user?.role), [user]);
  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(true);

  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);

  const [tab, setTab] = useState("alunos");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  // ✅ NOVO: filtro de professores
  const [disciplinaFiltro, setDisciplinaFiltro] = useState("");

  // Modal edição
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState(null); // "aluno" | "professor"
  const [editItem, setEditItem] = useState(null);
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

  // Modal exclusão
  const [delOpen, setDelOpen] = useState(false);
  const [delType, setDelType] = useState(null); // "aluno" | "professor"
  const [delItem, setDelItem] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

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
      toast.error(buildApiErrorMessage(err));
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
        x.turma ??
        x.Turma ??
        x.nomeTurma ??
        x.NomeTurma ??
        x.turmaNome ??
        x.TurmaNome ??
        "";
      return String(turma).toLowerCase() === String(turmaFiltro).toLowerCase();
    });
  }, [alunos, turmaFiltro]);

  // ✅ NOVO: lista de disciplinas (para montar o dropdown)
  const disciplinas = useMemo(() => {
    const set = new Set();
    for (const p of professores) {
      const d = p.disciplina ?? p.Disciplina ?? "";
      const v = String(d).trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [professores]);

  // ✅ NOVO: professores filtrados por disciplina
  const professoresFiltrados = useMemo(() => {
    if (!disciplinaFiltro) return professores;
    return professores.filter((p) => {
      const d = p.disciplina ?? p.Disciplina ?? "";
      return String(d).toLowerCase() === String(disciplinaFiltro).toLowerCase();
    });
  }, [professores, disciplinaFiltro]);

  function openEditAluno(a) {
    const id = a.id ?? a.Id ?? "";
    const nome = a.nome ?? a.Nome ?? a.name ?? "";
    const email = a.email ?? a.Email ?? "";
    const ra = a.ra ?? a.RA ?? "";
    const turma =
      a.turma ?? a.Turma ?? a.nomeTurma ?? a.NomeTurma ?? a.turmaNome ?? a.TurmaNome ?? "";

    setEditType("aluno");
    setEditItem(a);
    setEditFormAluno({
      id: String(id),
      nome: String(nome),
      email: String(email),
      ra: String(ra),
      turma: String(turma),
    });
    setEditOpen(true);
  }

  function openEditProfessor(p) {
    const id = p.id ?? p.Id ?? "";
    const nome = p.nome ?? p.Nome ?? p.name ?? "";
    const email = p.email ?? p.Email ?? "";
    const disciplina = p.disciplina ?? p.Disciplina ?? "";

    // IMPORTANTE: para não “zerar” no PUT, preservamos os campos do objeto vindo do back
    const dataNascimento = p.dataNascimento ?? p.DataNascimento ?? null;
    const usuarioId = p.usuarioId ?? p.UsuarioId ?? null;

    setEditType("professor");
    setEditItem(p);
    setEditFormProfessor({
      id: String(id),
      nome: String(nome),
      email: String(email),
      disciplina: String(disciplina),
      dataNascimento,
      usuarioId,
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (editLoading) return;
    setEditOpen(false);
    setEditType(null);
    setEditItem(null);
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
        toast.success("Aluno atualizado!");
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
        toast.success("Professor atualizado!");
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
      const id = delItem.id ?? delItem.Id;
      if (!id) {
        toast.error("ID inválido para exclusão.");
        return;
      }

      if (delType === "aluno") {
        await api.delete(`/Alunos/${id}`);
        toast.success("Aluno excluído!");
      } else if (delType === "professor") {
        await api.delete(`/Professores/${id}`);
        toast.success("Professor excluído!");
      }

      closeDelete();
      await loadAll(false);
    } catch (err) {
      toast.error(buildApiErrorMessage(err));
    } finally {
      setDelLoading(false);
    }
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
                  <label className="form-label">Filtrar por curso</label>
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
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>RA</th>
                      <th>Turma</th>
                      {isAdmin && <th style={{ width: 180 }}>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {alunosFiltrados.map((a) => {
                      const id = a.id ?? a.Id ?? "";
                      const nome = a.nome ?? a.Nome ?? a.name ?? "";
                      const email = a.email ?? a.Email ?? "";
                      const ra = a.ra ?? a.RA ?? "";
                      const turma =
                        a.turma ??
                        a.Turma ??
                        a.nomeTurma ??
                        a.NomeTurma ??
                        a.turmaNome ??
                        a.TurmaNome ??
                        "";

                      return (
                        <tr key={String(id) || `${nome}-${email}`}>
                          <td>{String(nome)}</td>
                          <td>{String(email)}</td>
                          <td>{String(ra)}</td>
                          <td>{String(turma)}</td>

                          {isAdmin && (
                            <td className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEditAluno(a)}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => openDelete("aluno", a)}
                              >
                                Excluir
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

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
              {/* ✅ NOVO: filtro por disciplina + contador usando filtrados */}
              <div className="row g-2 align-items-end mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Filtrar por disciplina</label>
                  <select
                    className="form-select"
                    value={disciplinaFiltro}
                    onChange={(e) => setDisciplinaFiltro(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {disciplinas.map((d) => (
                      <option key={String(d)} value={String(d)}>
                        {String(d)}
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
                    {professoresFiltrados.map((p) => {
                      const id = p.id ?? p.Id ?? "";
                      const nome = p.nome ?? p.Nome ?? p.name ?? "";
                      const email = p.email ?? p.Email ?? "";
                      const disciplina = p.disciplina ?? p.Disciplina ?? "";

                      return (
                        <tr key={String(id) || `${nome}-${email}`}>
                          <td>{String(nome)}</td>
                          <td>{String(email)}</td>
                          <td>{String(disciplina)}</td>

                          {isAdmin && (
                            <td className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEditProfessor(p)}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => openDelete("professor", p)}
                              >
                                Excluir
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

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

      {/* MODAL EDIÇÃO */}
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
                    onChange={(e) => setEditFormAluno((p) => ({ ...p, nome: e.target.value }))}
                    disabled={editLoading}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">E-mail</label>
                  <input
                    className="form-control"
                    type="email"
                    value={editFormAluno.email}
                    onChange={(e) => setEditFormAluno((p) => ({ ...p, email: e.target.value }))}
                    disabled={editLoading}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label">RA</label>
                  <input
                    className="form-control"
                    value={editFormAluno.ra}
                    onChange={(e) => setEditFormAluno((p) => ({ ...p, ra: e.target.value }))}
                    disabled={editLoading}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label">Turma</label>
                  <input
                    className="form-control"
                    value={editFormAluno.turma}
                    onChange={(e) => setEditFormAluno((p) => ({ ...p, turma: e.target.value }))}
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
                      setEditFormProfessor((p) => ({ ...p, nome: e.target.value }))
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
                      setEditFormProfessor((p) => ({ ...p, email: e.target.value }))
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
                      setEditFormProfessor((p) => ({ ...p, disciplina: e.target.value }))
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

      {/* MODAL EXCLUSÃO */}
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
              <b>
                {(delItem?.nome ?? delItem?.Nome ?? delItem?.name ?? "").toString()}
              </b>
              ?
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
