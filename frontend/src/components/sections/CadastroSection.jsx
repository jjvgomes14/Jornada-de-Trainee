import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

export default function CadastroSection() {
  const [tab, setTab] = useState("matriculas");

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h4 className="m-0">Cadastro</h4>

        <div className="d-flex flex-wrap gap-2">
          <button
            className={`btn btn-sm ${
              tab === "matriculas" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setTab("matriculas")}
          >
            Matrículas pendentes
          </button>

          <button
            className={`btn btn-sm ${
              tab === "professor" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setTab("professor")}
          >
            Cadastrar professor
          </button>
        </div>
      </div>

      {tab === "matriculas" ? <MatriculasPendentes /> : <CadastroProfessor />}
    </div>
  );
}

const CURSOS = [
  "Engenharia Elétrica",
  "Engenharia Mecânica",
  "Engenharia Civil",
  "Engenharia Quimica",
  "Engenharia de Automação e Controle",
  "Engenharia de Produção",
  "Engenharia de Software",
  "Engenharia de Robôs",
];

const DISCIPLINAS = [
  "Cálculo Numérico",
  "Física",
  "Química",
  "Desenho Técnico",
  "Sociologia",
  "Filosofia",
];

function MatriculasPendentes() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState([]);

  const [selected, setSelected] = useState(null);
  const [acao, setAcao] = useState(null);
  const [form, setForm] = useState({ ra: "", turma: "", observacao: "" });
  const [sending, setSending] = useState(false);

  async function load(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get("/Matriculas/pendentes");
      setPendentes(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Pendentes atualizados.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar pendentes${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAction(item, actionType) {
    setSelected(item);
    setAcao(actionType);
    setForm({ ra: "", turma: "", observacao: "" });
  }

  function closeAction() {
    if (sending) return;
    setSelected(null);
    setAcao(null);
    setForm({ ra: "", turma: "", observacao: "" });
  }

  const canSubmit = useMemo(() => {
    if (!selected || !acao) return false;
    if (acao === "aprovar") return !!form.ra.trim() && !!form.turma.trim() && !sending;
    return !sending;
  }, [selected, acao, form, sending]);

  async function submit() {
    if (!selected || !acao) return;

    setSending(true);
    try {
      await api.post("/Matriculas/responder", {
        id: selected.id ?? selected.Id,
        aprovar: acao === "aprovar",
        ra: form.ra.trim(),
        turma: form.turma.trim(),
        observacao: form.observacao.trim() || null,
      });

      toast.success(acao === "aprovar" ? "Matrícula aprovada!" : "Matrícula rejeitada!");
      closeAction();
      await load(false);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao responder matrícula.";
      toast.error(String(apiMsg));
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div className="text-muted">
          Total pendentes: <b>{pendentes.length}</b>
        </div>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => load(true)}
          disabled={loading}
        >
          {loading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                {/* ID REMOVIDO */}
                <th>Nome</th>
                <th>E-mail</th>
                <th>Nascimento</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((s) => {
                const id = s.id ?? s.Id;
                const nome = s.nome ?? s.Nome;
                const email = s.email ?? s.Email;

                const dn = s.dataNascimento || s.DataNascimento;
                const dc = s.dataCriacao || s.DataCriacao || s.CriadoEm;

                return (
                  <tr key={String(id)}>
                    {/* ID NÃO EXIBIDO */}
                    <td>{String(nome)}</td>
                    <td>{String(email)}</td>
                    <td>{dn ? new Date(dn).toLocaleDateString() : "-"}</td>
                    <td>{dc ? new Date(dc).toLocaleString() : "-"}</td>
                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => openAction(s, "aprovar")}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openAction(s, "rejeitar")}
                      >
                        Rejeitar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pendentes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Nenhuma matrícula pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && acao && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">
                {acao === "aprovar" ? "Aprovar matrícula" : "Rejeitar matrícula"}
              </h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={closeAction}
                disabled={sending}
              >
                Fechar
              </button>
            </div>

            <div className="mb-2">
              <div>
                <b>Aluno:</b> {selected.nome} ({selected.email})
              </div>
              <div className="text-muted">
                <b>CPF:</b> {selected.cpf} | <b>RG:</b> {selected.rg} |{" "}
                <b>Celular:</b> {selected.celular}
              </div>
              <div className="text-muted">
                <b>Endereço:</b> {selected.rua}, {selected.numeroCasa} -{" "}
                {selected.bairro} - {selected.cidade}/{selected.estado} - CEP{" "}
                {selected.cep}
              </div>
            </div>

            {acao === "aprovar" && (
              <div className="row g-2 mb-2">
                <div className="col-12 col-md-6">
                  <label className="form-label">RA (obrigatório)</label>
                  <input
                    className="form-control"
                    value={form.ra}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ra: e.target.value }))
                    }
                    disabled={sending}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Turma (obrigatório)</label>
                  <select
                    className="form-select"
                    value={form.turma}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, turma: e.target.value }))
                    }
                    disabled={sending}
                  >
                    <option value="">Selecione um curso</option>
                    {CURSOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Observação (opcional)</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.observacao}
                onChange={(e) =>
                  setForm((p) => ({ ...p, observacao: e.target.value }))
                }
                disabled={sending}
              />
            </div>

            <div className="d-grid">
              <button
                className={`btn ${
                  acao === "aprovar" ? "btn-success" : "btn-danger"
                }`}
                onClick={submit}
                disabled={!canSubmit}
              >
                {sending
                  ? "Enviando..."
                  : acao === "aprovar"
                  ? "Confirmar aprovação"
                  : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CadastroProfessor() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [disciplina, setDisciplina] = useState("");

  async function submit(e) {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !disciplina.trim()) {
      toast.error("Preencha nome, e-mail e disciplina.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/Professores", {
        nome: nome.trim(),
        email: email.trim(),
        disciplina: disciplina.trim(),
      });

      toast.success("Professor cadastrado!");
      setNome("");
      setEmail("");
      setDisciplina("");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Falha ao cadastrar professor.";
      toast.error(String(apiMsg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-12">
        <form className="card p-3" onSubmit={submit}>
          <h5 className="mb-2">Novo professor</h5>

          <label className="form-label">Nome</label>
          <input
            className="form-control mb-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={loading}
          />

          <label className="form-label">E-mail</label>
          <input
            className="form-control mb-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <label className="form-label">Disciplina</label>
          <select
            className="form-select mb-3"
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
          >
            <option value="">Selecione a disciplina</option>
            {DISCIPLINAS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
