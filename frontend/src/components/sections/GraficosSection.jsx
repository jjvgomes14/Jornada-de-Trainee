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
        const label = pick(x, ["label", "Label", "turma", "Turma", "disciplina", "Disciplina", "nome", "Nome"], "");
        const value = pick(x, ["value", "Value", "media", "Media", "mediaGeral", "MediaGeral", "nota", "Nota"], null);
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
    datasets: [{ label: datasetLabel, data: pairs.map((p) => p.value) }],
  };
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

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, []);

  const chartData = useMemo(() => makeBarData(pairs, "Média por turma"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos (Professor)</h4>
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
  const [pairs, setPairs] = useState([]);

  async function loadTurmas(showToast = false) {
    setLoadingTurmas(true);
    try {
      const { data } = await api.get("/Alunos/turmas");
      const arr = Array.isArray(data) ? data.map(String) : [];
      setTurmas(arr);
      if (arr.length > 0 && !turma) setTurma(arr[0]);
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
      setPairs([]);
      return;
    }
    setLoadingChart(true);
    try {
      const { data } = await api.get(`/Notas/grafico-admin`, { params: { turma: t } });
      setPairs(normalizePairs(data));
      if (showToast) toast.success("Gráfico atualizado.");
    } catch (err) {
      const status = err?.response?.status;
      toast.error(`Falha ao carregar gráfico do admin${status ? ` (HTTP ${status})` : ""}.`);
    } finally {
      setLoadingChart(false);
    }
  }

  useEffect(() => { loadTurmas(false); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (turma) loadChart(turma, false); /* eslint-disable-next-line */ }, [turma]);

  const chartData = useMemo(() => makeBarData(pairs, "Média por disciplina"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos (Admin)</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => loadTurmas(true)} disabled={loadingTurmas || loadingChart}>
            {loadingTurmas ? "..." : "Recarregar turmas"}
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => loadChart(turma, true)} disabled={!turma || loadingTurmas || loadingChart}>
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
              <select className="form-select" value={turma} onChange={(e) => setTurma(e.target.value)} disabled={loadingChart}>
                {turmas.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 text-muted">
              {loadingChart ? "Carregando gráfico..." : `Itens: ${pairs.length}`}
            </div>
          </div>

          {loadingChart ? (
            <div>Carregando...</div>
          ) : pairs.length === 0 ? (
            <div className="text-muted">Sem dados suficientes para esta turma.</div>
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

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, []);

  const chartData = useMemo(() => makeBarData(pairs, "Média por disciplina"), [pairs]);

  return (
    <div className="card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h4 className="m-0">Gráficos (Aluno)</h4>
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
