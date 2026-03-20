import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../ui/ToastContext";

const CURSOS = [
  "Engenharia Elétrica",
  "Engenharia Mecânica",
  "Engenharia Civil",
  "Engenharia Química",
  "Engenharia de Automação e Controle",
  "Engenharia de Produção",
  "Engenharia de Software",
  "Engenharia de Robôs",
];

function onlyDigits(v) {
  return (v || "").replace(/\D/g, "");
}

function maskPhoneBR(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})/, "($1")
      .replace(/^(\(\d{2})(\d{0,4})/, "$1) $2")
      .replace(/^(\(\d{2}\)\s\d{4})(\d{0,4})/, "$1-$2")
      .replace(/-$/, "");
  }
  return d
    .replace(/^(\d{0,2})/, "($1")
    .replace(/^(\(\d{2})(\d{0,5})/, "$1) $2")
    .replace(/^(\(\d{2}\)\s\d{5})(\d{0,4})/, "$1-$2")
    .replace(/-$/, "");
}

function maskCEP(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function maskCPF(value) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{0,3})/, "$1")
    .replace(/^(\d{3})(\d{0,3})/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d{0,3})/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{0,2})/, "$1.$2.$3-$4")
    .replace(/[-.]$/, "");
}

function maskRG(value) {
  const d = onlyDigits(value).slice(0, 9);
  return d
    .replace(/^(\d{0,2})/, "$1")
    .replace(/^(\d{2})(\d{0,3})/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d{0,3})/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d{0,1})/, "$1.$2.$3-$4")
    .replace(/[-.]$/, "");
}

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
        for (const m of val) if (typeof m === "string" && m.trim()) msgs.push(m.trim());
      } else if (typeof val === "string" && val.trim()) {
        msgs.push(val.trim());
      }
    }
    if (msgs.length) return msgs.join(" | ");
  }

  const status = err?.response?.status;
  if (status) return `Falha na requisição (HTTP ${status}).`;
  return "Erro ao enviar solicitação. Verifique os dados e tente novamente.";
}

function ensurePdf(file, label) {
  if (!file) return `${label} é obrigatório.`;
  const fileName = String(file.name || "").toLowerCase();
  const contentType = String(file.type || "").toLowerCase();

  if (contentType !== "application/pdf" && !fileName.endsWith(".pdf")) {
    return `${label} deve ser um arquivo PDF.`;
  }

  return "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

export default function MatriculaModal({ open, onClose }) {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    dataNascimento: "",
    rg: "",
    cpf: "",
    telefone: "",
    cursoDesejado: "",
    comprovanteEndereco: null,
    historicoEscolar: null,
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  const cepDigits = useMemo(() => onlyDigits(form.cep), [form.cep]);

  useEffect(() => {
    if (open) {
      setLoading(false);
      setCepLoading(false);
      setForm({
        nome: "",
        email: "",
        dataNascimento: "",
        rg: "",
        cpf: "",
        telefone: "",
        cursoDesejado: "",
        comprovanteEndereco: null,
        historicoEscolar: null,
        cep: "",
        rua: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
      });
    }
  }, [open]);

  useEffect(() => {
    async function fetchCep() {
      if (cepDigits.length !== 8) return;

      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();

        if (data.erro) {
          toast.error("CEP não encontrado.");
          return;
        }

        setForm((prev) => ({
          ...prev,
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        }));
        toast.info("Endereço preenchido pelo CEP.");
      } catch {
        toast.error("Falha ao consultar CEP. Tente novamente.");
      } finally {
        setCepLoading(false);
      }
    }

    fetchCep();
  }, [cepDigits, toast]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!form.nome.trim()) return "Informe o nome.";
    if (!form.email.trim()) return "Informe o e-mail.";
    if (!form.dataNascimento) return "Informe a data de nascimento.";
    if (!form.rg.trim()) return "Informe o RG.";
    if (onlyDigits(form.cpf).length !== 11) return "Informe um CPF válido.";
    if (onlyDigits(form.telefone).length < 10) return "Informe um celular válido.";
    if (!form.cursoDesejado) return "Selecione o curso desejado.";

    const comprovanteError = ensurePdf(form.comprovanteEndereco, "Comprovante de endereço");
    if (comprovanteError) return comprovanteError;

    const historicoError = ensurePdf(form.historicoEscolar, "Histórico Escolar");
    if (historicoError) return historicoError;

    if (onlyDigits(form.cep).length !== 8) return "Informe um CEP válido.";
    if (!form.rua.trim()) return "Informe a rua.";
    if (!form.numero.trim()) return "Informe o número.";
    if (!form.bairro.trim()) return "Informe o bairro.";
    if (!form.cidade.trim()) return "Informe a cidade.";
    if (!form.estado.trim()) return "Informe o estado.";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const [comprovanteEnderecoBase64, historicoEscolarBase64] = await Promise.all([
        fileToBase64(form.comprovanteEndereco),
        fileToBase64(form.historicoEscolar),
      ]);

      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        dataNascimento: `${form.dataNascimento}T00:00:00`,
        rg: form.rg.trim(),
        cpf: onlyDigits(form.cpf),
        celular: onlyDigits(form.telefone),
        cursoDesejado: form.cursoDesejado,
        comprovanteEnderecoNomeArquivo: form.comprovanteEndereco?.name || "comprovante-endereco.pdf",
        comprovanteEnderecoContentType: form.comprovanteEndereco?.type || "application/pdf",
        comprovanteEnderecoBase64,
        historicoEscolarNomeArquivo: form.historicoEscolar?.name || "historico-escolar.pdf",
        historicoEscolarContentType: form.historicoEscolar?.type || "application/pdf",
        historicoEscolarBase64,
        cep: onlyDigits(form.cep),
        estado: form.estado.trim(),
        cidade: form.cidade.trim(),
        bairro: form.bairro.trim(),
        rua: form.rua.trim(),
        numeroCasa: form.numero.trim(),
      };

      await api.post("/Matriculas/solicitar", payload);

      toast.success("Solicitação de matrícula enviada!");
      onClose();
    } catch (err) {
      toast.error(buildApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="modal-backdrop-custom"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target.classList.contains("modal-backdrop-custom")) onClose();
      }}
    >
      <div className="modal-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Solicitar Matrícula</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={loading}>
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="row g-2">
          <div className="col-12">
            <label className="form-label">Nome</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">E-mail</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-6">
            <label className="form-label">Data de nascimento</label>
            <input
              className="form-control"
              type="date"
              value={form.dataNascimento}
              onChange={(e) => setField("dataNascimento", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-6">
            <label className="form-label">Celular</label>
            <input
              className="form-control"
              value={form.telefone}
              onChange={(e) => setField("telefone", maskPhoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
              disabled={loading}
            />
          </div>

          <div className="col-6">
            <label className="form-label">RG</label>
            <input
              className="form-control"
              value={form.rg}
              onChange={(e) => setField("rg", maskRG(e.target.value))}
              disabled={loading}
            />
          </div>

          <div className="col-6">
            <label className="form-label">CPF</label>
            <input
              className="form-control"
              value={form.cpf}
              onChange={(e) => setField("cpf", maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Curso desejado</label>
            <select
              className="form-select"
              value={form.cursoDesejado}
              onChange={(e) => setField("cursoDesejado", e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione um curso</option>
              {CURSOS.map((curso) => (
                <option key={curso} value={curso}>
                  {curso}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Comprovante de endereço (PDF)</label>
            <input
              className="form-control"
              type="file"
              accept=".pdf"
              onChange={(e) => setField("comprovanteEndereco", e.target.files?.[0] ?? null)}
              //disabled={loading}
            />
            {form.comprovanteEndereco && (
              <small className="text-muted">Arquivo selecionado: {form.comprovanteEndereco.name}</small>
            )}
          </div>

          <div className="col-12">
            <label className="form-label">Histórico Escolar (PDF)</label>
            <input
              className="form-control"
              type="file"
              accept=".pdf"
              onChange={(e) => setField("historicoEscolar", e.target.files?.[0] ?? null)}
              //disabled={loading}
            />
            {form.historicoEscolar && (
              <small className="text-muted">Arquivo selecionado: {form.historicoEscolar.name}</small>
            )}
          </div>

          <div className="col-6">
            <label className="form-label">CEP</label>
            <input
              className="form-control"
              value={form.cep}
              onChange={(e) => setField("cep", maskCEP(e.target.value))}
              placeholder="00000-000"
              disabled={loading}
            />
            {cepLoading && <small className="text-muted">Consultando CEP...</small>}
          </div>

          <div className="col-6">
            <label className="form-label">Número</label>
            <input
              className="form-control"
              value={form.numero}
              onChange={(e) => setField("numero", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Rua</label>
            <input
              className="form-control"
              value={form.rua}
              onChange={(e) => setField("rua", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-6">
            <label className="form-label">Bairro</label>
            <input
              className="form-control"
              value={form.bairro}
              onChange={(e) => setField("bairro", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-4">
            <label className="form-label">Cidade</label>
            <input
              className="form-control"
              value={form.cidade}
              onChange={(e) => setField("cidade", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="col-2">
            <label className="form-label">UF</label>
            <input
              className="form-control"
              value={form.estado}
              onChange={(e) => setField("estado", e.target.value.toUpperCase())}
              maxLength={2}
              disabled={loading}
            />
          </div>

          <div className="col-12 mt-2 d-grid">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Solicitação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}