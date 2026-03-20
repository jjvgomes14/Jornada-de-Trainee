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

function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

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
        return {
          label: String(label),
          value: Number.isNaN(num) ? 0 : num,
        };
      })
      .filter(Boolean);
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([k, v]) => {
      const num = Number(String(v).replace(",", "."));
      return {
        label: String(k),
        value: Number.isNaN(num) ? 0 : num,
      };
    });
  }

  return [];
}

function normalizeAdminSeries(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const turma = pick(item, ["turma", "Turma"], "");
      const disciplina = pick(item, ["disciplina", "Disciplina"], "");
      const media = pick(item, ["media", "Media", "value", "Value"], 0);
      const valor = Number(String(media).replace(",", "."));

      if (!turma || !disciplina) return null;

      return {
        turma: String(turma),
        disciplina: String(disciplina),
        media: Number.isNaN(valor) ? 0 : valor,
      };
    })
    .filter(Boolean);
}

function makeBarData(pairs, datasetLabel) {
  return {
    labels: pairs.map((p) => p.label),
    datasets: [
      {
        label: datasetLabel,
        data: pairs.map((p) => p.value),
        backgroundColor: "rgba(54, 162, 235, 0.65)",
        borderColor: "rgba(54, 162, 235, 1)",
      },
    ],
  };
}

const DATASET_COLORS = [
  { backgroundColor: "rgba(54, 162, 235, 0.65)", borderColor: "rgba(54, 162, 235, 1)" },
  { backgroundColor: "rgba(255, 99, 132, 0.65)", borderColor: "rgba(255, 99, 132, 1)" },
  { backgroundColor: "rgba(255, 206, 86, 0.65)", borderColor: "rgba(255, 206, 86, 1)" },
  { backgroundColor: "rgba(75, 192, 192, 0.65)", borderColor: "rgba(75, 192, 192, 1)" },
  { backgroundColor: "rgba(153, 102, 255, 0.65)", borderColor: "rgba(153, 102, 255, 1)" },
  { backgroundColor: "rgba(255, 159, 64, 0.65)", borderColor: "rgba(255, 159, 64, 1)" },
  { backgroundColor: "rgba(99, 255, 132, 0.65)", borderColor: "rgba(99, 255, 132, 1)" },
  { backgroundColor: "rgba(201, 203, 207, 0.65)", borderColor: "rgba(201, 203, 207, 1)" },
  { backgroundColor: "rgba(255, 99, 255, 0.65)", borderColor: "rgba(255, 99, 255, 1)" },
  { backgroundColor: "rgba(0, 200, 83, 0.65)", borderColor: "rgba(0, 200, 83, 1)" },
];

function makeAdminComparisonData(items) {
  const disciplinas = Array.from(new Set(items.map((item) => item.disciplina)));
  const turmas = Array.from(new Set(items.map((item) => item.turma)));

  const datasets = turmas.map((turma, index) => {
    const color = DATASET_COLORS[index % DATASET_COLORS.length];

    return {
      label: turma,
      data: disciplinas.map((disciplina) => {
        const found = items.find((item) => item.turma === turma && item.disciplina === disciplina);
        return found ? found.media : 0;
      }),
      backgroundColor: color.backgroundColor,
      borderColor: color.borderColor,
      borderWidth: 1,
    };
  });

  return {
    labels: disciplinas,
    datasets,
  };
}

function buildApiMessage(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (data?.errors && typeof data.errors === "object") {
    const joined = Object.values(data.errors).flat().join(" | ");
    if (joined) return joined;
  }

  return fallback;
}

const barOptions = {
  responsive: true,
  plugins: {
    legend: { position: "top" },
    title: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 10,
    },
  },
};

const adminBarOptions = {
  responsive: true,
  plugins: {
    legend: { position: "top" },
    title: { display: false },
    tooltip: {
      callbacks: {
        label(context) {
          const label = context.dataset?.label || "Turma";
          const value = context.parsed?.y ?? 0;
          return `${label}: ${Number(value).toFixed(2)}`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 10,
    },
  },
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
      toast.error(String(buildApiMessage(err, "Falha ao carregar gráfico do professor.")));
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
  const [loadingChart, setLoadingChart] = useState(true);
  const [items, setItems] = useState([]);

  async function loadChart(showToast = false) {
    setLoadingChart(true);

    try {
      const { data } = await api.get("/Notas/grafico-admin");
      setItems(normalizeAdminSeries(data));

      if (showToast) toast.success("Gráfico atualizado.");
    } catch (err) {
      setItems([]);
      toast.error(String(buildApiMessage(err, "Falha ao carregar gráfico do administrador.")));
    } finally {
      setLoadingChart(false);
    }
  }

  useEffect(() => {
    loadChart(false);
  }, []);

  const chartData = useMemo(() => makeAdminComparisonData(items), [items]);
  const totalTurmas = useMemo(() => new Set(items.map((item) => item.turma)).size, [items]);
  const totalDisciplinas = useMemo(
    () => new Set(items.map((item) => item.disciplina)).size,
    [items]
  );

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos</h4>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => loadChart(true)}
          disabled={loadingChart}
        >
          {loadingChart ? "Atualizando..." : "Recarregar gráfico"}
        </button>
      </div>

      {loadingChart ? (
        <div>Carregando gráfico comparativo...</div>
      ) : items.length === 0 ? (
        <div className="text-muted">Sem dados suficientes para gerar o comparativo entre turmas.</div>
      ) : (
        <>
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-lg-8 text-muted">
              Turmas: {totalTurmas} | Disciplinas: {totalDisciplinas}
            </div>
          </div>

          <div className="card p-2">
            <Bar options={adminBarOptions} data={chartData} />
          </div>
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
      toast.error(String(buildApiMessage(err, "Falha ao carregar gráfico do aluno.")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  const chartData = useMemo(() => makeBarData(pairs, "Média por disciplina"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos</h4>

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