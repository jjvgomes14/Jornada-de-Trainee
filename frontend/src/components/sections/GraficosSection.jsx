import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../ui/ToastContext";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Paleta fixa (repete se tiver mais turmas do que cores)
// Você pode trocar/ajustar as cores aqui.
const TURMA_COLORS = [
  { bg: "rgba(54, 162, 235, 0.55)", border: "rgba(54, 162, 235, 1)" },   // azul
  { bg: "rgba(255, 99, 132, 0.55)", border: "rgba(255, 99, 132, 1)" },  // rosa/vermelho
  { bg: "rgba(255, 206, 86, 0.55)", border: "rgba(255, 206, 86, 1)" },  // amarelo
  { bg: "rgba(75, 192, 192, 0.55)", border: "rgba(75, 192, 192, 1)" },  // verde água
  { bg: "rgba(153, 102, 255, 0.55)", border: "rgba(153, 102, 255, 1)" },// roxo
  { bg: "rgba(255, 159, 64, 0.55)", border: "rgba(255, 159, 64, 1)" },  // laranja
  { bg: "rgba(201, 203, 207, 0.55)", border: "rgba(201, 203, 207, 1)" },// cinza
  { bg: "rgba(99, 255, 132, 0.45)", border: "rgba(99, 255, 132, 1)" },  // verde
];

function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

// Continua útil para gráficos simples (Professor / Aluno / Admin quando 1 turma)
function normalizePairs(data) {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map((x) => {
        const label = pick(
          x,
          ["label", "Label", "turma", "Turma", "disciplina", "Disciplina", "nome", "Nome"],
          ""
        );
        const value = pick(
          x,
          ["value", "Value", "media", "Media", "mediaGeral", "MediaGeral", "nota", "Nota"],
          null
        );
        if (!label) return null;
        const num = Number(String(value).replace(",", "."));
        return { label: String(label), value: Number.isNaN(num) ? 0 : num };
      })
      .filter(Boolean);
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([k, v]) => {
      const num = Number(String(v).replace(",", "."));
      return { label: String(k), value: Number.isNaN(num) ? 0 : num };
    });
  }

  return [];
}

function makeBarData(pairs, datasetLabel) {
  return {
    labels: pairs.map((p) => p.label),
    datasets: [
      {
        label: datasetLabel,
        data: pairs.map((p) => p.value),
        backgroundColor: "#3e82e9",
        borderColor: "#3e82e9",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };
}

/**
 * Monta gráfico AGRUPADO:
 * - labels = disciplinas
 * - datasets = 1 por turma
 * Espera payload do backend assim:
 * [{ disciplina: "Mat", turma: "1A", media: 7.5 }, ...]
 *
 * ✅ Agora cada turma recebe uma cor diferente (backgroundColor/borderColor)
 */
function makeGroupedByTurmaData(rows, turmasDisponiveis) {
  const safeRows = Array.isArray(rows) ? rows : [];

  // 1) Descobrir disciplinas (labels)
  const disciplinasSet = new Set();
  for (const r of safeRows) {
    const disc = pick(r, ["disciplina", "Disciplina"], "");
    if (disc) disciplinasSet.add(String(disc));
  }
  const disciplinas = Array.from(disciplinasSet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // 2) Descobrir turmas (datasets). Preferimos as turmas carregadas do endpoint /Alunos/turmas.
  const turmasClean = (turmasDisponiveis || []).filter((t) => t && t !== "Todas");
  const turmasSet = new Set(turmasClean);

  // Se por algum motivo vier turma no payload que não está na lista, adiciona também:
  for (const r of safeRows) {
    const t = pick(r, ["turma", "Turma"], "");
    if (t && t !== "Todas") turmasSet.add(String(t));
  }

  const turmas = Array.from(turmasSet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // 3) Index para achar rápido: key = `${disciplina}||${turma}`
  const map = new Map();
  for (const r of safeRows) {
    const disc = String(pick(r, ["disciplina", "Disciplina"], "")).trim();
    const turma = String(pick(r, ["turma", "Turma"], "")).trim();
    const mediaRaw = pick(r, ["media", "Media", "value", "Value"], 0);
    const media = Number(String(mediaRaw).replace(",", "."));
    if (!disc || !turma) continue;
    map.set(`${disc}||${turma}`, Number.isNaN(media) ? 0 : media);
  }

  // 4) Datasets por turma (✅ cada turma com cor diferente)
  const datasets = turmas.map((t, idx) => {
    const c = TURMA_COLORS[idx % TURMA_COLORS.length];
    return {
      label: t,
      data: disciplinas.map((d) => map.get(`${d}||${t}`) ?? 0),
      backgroundColor: c.bg,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 6,
    };
  });

  return { labels: disciplinas, datasets };
}

const barOptions = {
  responsive: true,
  plugins: { legend: { position: "top" }, title: { display: false } },
  scales: { y: { beginAtZero: true, suggestedMax: 10 } },
};

export default function GraficosSection({ role }) {
  if (role === "professor") return <GraficoProfessor />;
  if (role === "admin") return <GraficoAdmin />;
  if (role === "aluno") return <GraficoAluno />;
  return <div className="text-muted">Perfil não reconhecido.</div>;
}

function GraficoProfessor() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState([]);

  async function load(showToast = false) {
    setLoading(true);
    try {
      const { data } = await api.get("/Notas/grafico-professor");
      setPairs(normalizePairs(data));
      if (showToast) toast.success("Gráfico atualizado.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar gráfico do professor${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  const chartData = useMemo(() => makeBarData(pairs, "Média por turma"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
          {loading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : pairs.length === 0 ? (
        <div className="text-muted">Sem dados suficientes para gerar o gráfico.</div>
      ) : (
        <div className="card p-2">
          <Bar options={barOptions} data={chartData} />
        </div>
      )}
    </div>
  );
}

function GraficoAdmin() {
  const toast = useToast();

  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);

  const [turmas, setTurmas] = useState([]);
  const [turma, setTurma] = useState("");
  const [rawRows, setRawRows] = useState([]);

  async function loadTurmas(showToast = false) {
    setLoadingTurmas(true);
    try {
      const { data } = await api.get("/Alunos/turmas");
      const arr = Array.isArray(data) ? data.map(String) : [];
      const withAll = ["Todas", ...arr];
      setTurmas(withAll);
      if (withAll.length > 0 && !turma) setTurma(withAll[0]);
      if (showToast) toast.success("Turmas atualizadas.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar turmas${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoadingTurmas(false);
    }
  }

  async function loadChart(t, showToast = false) {
    if (!t) {
      setRawRows([]);
      return;
    }
    setLoadingChart(true);
    try {
      const { data } = await api.get(`/Notas/grafico-admin`, { params: { turma: t } });
      setRawRows(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Gráfico atualizado.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar gráfico do admin${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoadingChart(false);
    }
  }

  useEffect(() => {
    loadTurmas(false);
    /* eslint-disable-next-line */
  }, []);
  useEffect(() => {
    if (turma) loadChart(turma, false);
    /* eslint-disable-next-line */
  }, [turma]);

  const isTodas = String(turma).toLowerCase() === "todas";

  const chartData = useMemo(() => {
    if (!rawRows || rawRows.length === 0) {
      return { labels: [], datasets: [] };
    }

    if (isTodas) {
      return makeGroupedByTurmaData(rawRows, turmas);
    }

    const pairs = normalizePairs(
      rawRows.map((r) => ({
        disciplina: r.disciplina,
        media: r.media,
      }))
    );
    return makeBarData(pairs, `Média por disciplina (${turma})`);
  }, [rawRows, isTodas, turmas, turma]);

  const totalItems = Array.isArray(rawRows) ? rawRows.length : 0;

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos</h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadTurmas(true)}
            disabled={loadingTurmas || loadingChart}
          >
            {loadingTurmas ? "..." : "Recarregar turmas"}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadChart(turma, true)}
            disabled={!turma || loadingTurmas || loadingChart}
          >
            {loadingChart ? "..." : "Recarregar gráfico"}
          </button>
        </div>
      </div>

      {loadingTurmas ? (
        <div>Carregando turmas...</div>
      ) : turmas.length === 0 ? (
        <div className="text-muted">Não há turmas cadastradas.</div>
      ) : (
        <>
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Turma</label>
              <select
                className="form-select"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                disabled={loadingChart}
              >
                {turmas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 text-muted">
              {loadingChart ? "Carregando gráfico..." : `Registros: ${totalItems}`}
            </div>
          </div>

          {loadingChart ? (
            <div>Carregando...</div>
          ) : !chartData.labels || chartData.labels.length === 0 ? (
            <div className="text-muted">Sem dados suficientes para gerar o gráfico.</div>
          ) : (
            <div className="card p-2">
              <Bar options={barOptions} data={chartData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GraficoAluno() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState(null);
  const [pairs, setPairs] = useState([]);

  async function load(showToast = false) {
    setLoading(true);
    try {
      const me = await api.get("/Alunos/me");
      setAluno(me.data);

      const alunoId = me.data?.id ?? me.data?.Id;
      const { data } = await api.get(`/Notas/grafico-aluno/${alunoId}`);
      setPairs(normalizePairs(data));

      if (showToast) toast.success("Gráfico atualizado.");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data || "Falha ao carregar gráfico do aluno.";
      toast.error(String(apiMsg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    /* eslint-disable-next-line */
  }, []);

  const chartData = useMemo(() => makeBarData(pairs, "Média por disciplina"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos </h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
          {loading ? "Atualizando..." : "Recarregar"}
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : pairs.length === 0 ? (
        <div className="text-muted">Sem dados suficientes para gerar o gráfico.</div>
      ) : (
        <>
          {aluno && (
            <div className="text-muted mb-2">
              <b>{aluno.nome ?? aluno.Nome}</b> — Turma: <b>{aluno.turma ?? aluno.Turma}</b>
            </div>
          )}
          <div className="card p-2">
            <Bar options={barOptions} data={chartData} />
          </div>
        </>
      )}
    </div>
  );
}